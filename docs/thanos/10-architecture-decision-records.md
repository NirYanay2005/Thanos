# 10 — Architecture Decision Records

**Status vocabulary:**

| Status | Meaning |
|---|---|
| **Proposed** | The team's recommendation. Not yet validated. |
| **Proposed — PoC-gated** | Becomes *Accepted* only if the named PoC passes. |
| **Needs founder sign-off** | Changes a founder-stated requirement or a business decision. |
| **Accepted** | Validated. None are accepted yet, since this is the planning phase. |

Format: context → options → decision → consequences → reconsider when. Evidence links are in [references.md](references.md).

| ADR | Topic | Status |
|---|---|---|
| [001](#adr-001-architecture-style) | Architecture style | Proposed |
| [002](#adr-002-frontend-graph-representation) | Frontend graph representation | Proposed — PoC-5 |
| [003](#adr-003-project-yaml-model) | Project YAML model | Proposed |
| [004](#adr-004-deployer-plugin-interface) | Deployer / plugin interface | Proposed — PoC-2, PoC-4 |
| [005](#adr-005-glove-abstraction-and-runtime-execution) | Glove abstraction and runtime execution | Proposed — PoC-3 |
| [006](#adr-006-capability-discovery-and-compatibility-matching) | Capability discovery and compatibility matching | Proposed |
| [007](#adr-007-deployment-orchestration) | Deployment orchestration (Argo Workflows evaluation) | **Needs founder sign-off** |
| [008](#adr-008-desired-state-reconciliation) | Desired-state reconciliation | Proposed |
| [009](#adr-009-storage-architecture) | Storage architecture | Proposed |
| [010](#adr-010-user-cluster-connectivity) | User cluster connectivity | Proposed — PoC-1 |
| [011](#adr-011-secret-management) | Secret management | Proposed |
| [012](#adr-012-mvp-processing-scope) | MVP processing scope | Proposed |
| [013](#adr-013-expression-language) | Expression language (CEL) | Proposed |
| [014](#adr-014-product-name) | Product name | **Needs founder sign-off** |

---

## ADR-001 Architecture style
- **Context:** three engineers, a domain still being discovered, and hard trust boundaries (the user cluster; third-party deployer code).
- **Options:**
  1. Microservices.
  2. Modular monolith.
  3. Modular monolith + out-of-process components only at trust boundaries.
- **Decision:** (3).
  - One Go control-plane binary with enforced module boundaries.
  - An agent in each user cluster.
  - HTTP deployers as pods in user clusters.
- **Consequences:**
  - One deployable and one database, with transactional consistency.
  - Module discipline must be enforced by linting.
  - Later extraction candidates are identified: agent gateway, status ingest, executors.
- **Reconsider when:** a module needs independent scaling or a different release cadence, measured in production. Or the team grows beyond ~10 engineers.

## ADR-002 Frontend graph representation
- **Context:** the canvas must stay consistent with YAML, support undo/redo, validation overlays and runtime status, with no per-technology UI code.
- **Options:**
  1. Canvas library state as source of truth, exported to YAML.
  2. **The project document as source of truth, with the canvas as a projection.**
  3. A custom canvas (SVG/Canvas from scratch).
- **Decision:** (2), with React Flow (`@xyflow/react`) for rendering. Undo/redo via document patches. Forms generated from package JSON Schemas.
- **Consequences:**
  - Round-tripping YAML ↔ canvas is lossless by construction.
  - The UI cannot hold state the backend doesn't understand.
  - Layout is stored as a non-semantic `layout` section.
- **Reconsider when:** PoC-5 shows React Flow below 30 fps at 200 nodes / 400 edges on a mid-range laptop. Then evaluate a canvas/WebGL renderer for large graphs only.

## ADR-003 Project YAML model
- **Context:** projects must be declarative, versioned, diffable, importable and free of secrets and implementation detail.
- **Options:**
  1. Embed Kubernetes manifests / Helm values.
  2. **Thin logical model (technologies, Gloves, environment refs) + package-defined config.**
  3. Adopt an existing spec (OAM/KubeVela Application, Score).
- **Decision:** (2), with schema `thanos/v1alpha1`, a derived resolution lock, canonical serialization, and migration functions.
  - OAM and Score were considered. OAM's component/trait model has no notion of typed, capability-resolved connections between data technologies. Score describes one workload's dependencies, not a multi-technology graph.
  - Both could become *export* formats later.
- **Consequences:**
  - We own a spec and must version it carefully.
  - Packages carry the implementation knowledge.
- **Reconsider when:** design partners demand OAM/Score compatibility, or the spec grows to duplicate one of them.

## ADR-004 Deployer plugin interface
- **Context:** operators, containers and external APIs differ. The core must be stable. No third-party code may run in the control plane.
- **Options:**
  - A. In-process plugins.
  - B. HTTP deployer for everything.
  - C. One Kubernetes controller per technology.
  - D. Hybrid.
- **Decision:** D, two mechanisms ([06 §2](06-deployer-plugin-contract.md#2-options-compared)):
  - Declarative `kubernetes` packages, rendered and applied by the agent's built-in driver. This covers operators and containers.
  - **Deployer Protocol v1** HTTP services in the user cluster for external APIs.
- **Consequences:**
  - Most technologies need zero code.
  - The built-in driver is critical-path code and needs a thorough test suite.
  - External deployers are separately versioned images.
- **Reconsider when:** a class of technologies needs imperative multi-step logic not expressible as templates + readiness. First choice in that case is an HTTP deployer, not a new mechanism.

## ADR-005 Glove abstraction and runtime execution
- **Context:** the original four modes overlapped. Connections must be deployable, explainable and distinguish logical from runtime paths.
- **Decision:**
  - Port roles come from two axes, direction × initiation. A Glove joins an output port to an input port.
  - The realization class is derived: R0 config-only, R1 provision, R2 adapter (R3 processing later). Each realization class is a distinct planner step type.
  - Adapters are packages. All runtime pieces run in the user cluster.
- **Consequences:**
  - Brokers like Kafka are explicit nodes.
  - "Kafka-to-S3" is an adapter.
  - The UI must teach push/pull. Port glyphs and explanations do this.
- **Reconsider when:** users consistently find explicit broker nodes too verbose. Then consider a UI shortcut that creates broker + 2 Gloves, keeping the model unchanged.

## ADR-006 Capability discovery and compatibility matching
- **Options:**
  1. Pairwise compatibility matrix.
  2. Name-based heuristics.
  3. **Declared port bindings over a controlled protocol/format/auth vocabulary, with deterministic matching and ≤ 1 adapter hop.**
- **Decision:** (3), plus a resolution lock for stability and explanations for every rejection.
  - An optional deny-list handles known-broken combinations.
  - Runtime `describe` from HTTP deployers may only narrow capabilities.
- **Consequences:**
  - Vocabulary governance is a real job (catalog owner).
  - Payload-schema compatibility is out of MVP scope and labeled as such.
- **Reconsider when:** adapter chains of 2+ are commonly needed, or format conversion becomes common. Then add bounded multi-hop search with cost display.

## ADR-007 Deployment orchestration
- **Context:** the founders proposed Argo Workflows. Requirements:
  - ordered, idempotent, recoverable deployments into **many user-owned clusters behind firewalls**;
  - continuous status and drift after deployment;
  - no central cluster credentials.
- **Evidence (see references):**
  - Argo Workflows runs workflows to completion **inside the cluster where its controller runs**. There is no official multi-cluster support (multi-cluster setups rely on community projects or OCM).
  - It provides retries (`retryStrategy`), deadlines (`activeDeadlineSeconds`), mutex/semaphore synchronization and resource templates with success/failure conditions.
  - A finished Workflow does **not** keep reconciling.
  - Workflow pods run with a ServiceAccount and need controller RBAC.
  - Argo CD reconciles continuously but uses a hub holding cluster credentials. Its pull-based Agent is pre-GA.
- **Options:**
  1. **Argo Workflows in the control-plane cluster**, pushing to user clusters. Needs inbound access plus central kubeconfigs, which violates the connectivity constraint.
  2. **Argo Workflows installed in every user cluster**, triggered by the agent.
     - Pros: retries, a UI, mature step execution.
     - Cons: cluster-scoped CRDs and a controller per customer cluster (admin install burden); a second state store we must mirror back; workflow logic split between templates and our planner; still no post-deployment reconciliation.
  3. **Argo CD (+ agent)** as the applier. GitOps fits declarative manifests, but external-API steps, Glove ordering and readiness of CR outputs don't map cleanly. The Agent is pre-GA.
  4. **Native coordinator**:
     - The control plane persists the plan DAG and step state in Postgres.
     - The agent executes idempotent steps (SSA + readiness) and keeps observing afterward.
     - Operators reconcile their own resources.
- **Decision (recommended):** (4) for the MVP.
  - Keep the plan format engine-agnostic: a JSON DAG of typed steps, so a step can be delegated to an Argo Workflow later.
  - Argo Workflows stays a candidate **for imperative, long-running in-cluster jobs** (data migrations, source builds), where its strengths matter, invoked as a step type `RunWorkflow` in clusters that already have it.
  - Argo CD stays a candidate for an **"export to GitOps"** mode for customers standardized on OpenShift GitOps.
- **Consequences:**
  - We build and test a small step coordinator: ~1–2k lines of Go, plus thorough tests.
  - Customers install exactly one component (the agent) with namespaced RBAC.
  - Status, drift and recovery use one mechanism.
- **Reconsider when:**
  - PoC-1/PoC-4 show the coordinator is more complex than estimated (> 3 engineer-weeks to reliable), or
  - design partners already run Argo Workflows everywhere and want deployments visible there, or
  - steps become mostly long imperative jobs.
- **Founder input needed:** this changes a stated requirement.

## ADR-008 Desired-state reconciliation
- **Decision:**
  - Operators reconcile their CRs.
  - The agent continuously *observes* applied intent and *reports* drift.
  - Corrections are explicit deployments (MVP). `driftPolicy: correct` (auto re-apply) is a later environment option using the same code path.
  - The control plane never mutates clusters outside a deployment.
- **Consequences:** predictable, auditable behavior. Drift may persist until a human acts.
- **Reconsider when:** pilots ask for self-healing on specific environments. Enable `correct` per environment.

## ADR-009 Storage architecture
- **Decision:**
  - PostgreSQL only: `jsonb` documents, relational state machines, partitioned audit, outbox.
  - No object store, cache, search or time-series DB in MVP. Logs are not stored.
- **Reconsider when:** documents exceed ~5 MiB, audit volume exceeds ~50 M rows/year per region, or log retention becomes a paid feature.

## ADR-010 User cluster connectivity
- **Decision:**
  - Outbound-only agent per cluster, HTTPS long-poll, proxy-aware.
  - Join token → short-lived credential.
  - Namespaced RBAC, no cluster-admin.
  - Self-hosted control plane for air-gapped customers.
- **Consequences:** agent lifecycle (upgrades, version skew) is ours to manage. Agent supports N-1 control-plane versions.
- **Reconsider when:** customers require zero in-cluster footprint. Then offer GitOps export as an alternative, never central kubeconfigs.

## ADR-011 Secret management
- **Decision:**
  - Thanos stores no secret values. Projects contain `secretRef`s.
  - Values live in user-cluster Secrets (optionally synced by External Secrets Operator) or operator-generated Secrets.
  - Delivery is via `secretKeyRef`. HTTP deployers mount their own credentials.
- **Consequences:**
  - Users must create Secrets before deploying. The UI shows exact `oc create secret` commands and preflight verifies existence.
  - This is less "magic" but a strong trust story.
- **Reconsider when:** design partners are blocked by this step. Then add a KMS-backed, end-to-end-encrypted secret delivery.

## ADR-012 MVP processing scope
- **Decision:**
  - No built-in processing engine (NiFi/Flink) in MVP.
  - Processing engines join later as technologies or adapters (R3) through existing contracts.
  - Kafka Connect appears only as the runtime of the S3 sink adapter.
- **Consequences:** the MVP proves deploy-and-connect, not transformation. Demos must not imply transformation.
- **Reconsider when:** ≥ 2 design partners rank transformation as a top-3 blocker. Then start with the Flink Kubernetes Operator or Redpanda Connect (see [01 §7](01-product-requirements.md#7-future-processing-capabilities)).

## ADR-013 Expression language
- **Decision:** CEL for template expressions, package validation rules and readiness rules. Go templates, Jsonnet, CUE and Helm were rejected for packages:
  - Turing-completeness, a larger attack surface, or unfamiliarity.
  - CEL is cost-bounded and already used by Kubernetes for CRD validation and admission policy.
- **Consequences:** templates are less expressive. Complex logic must move into an HTTP deployer.
- **Reconsider when:** > 30% of first-party packages need workarounds.

## ADR-014 Product name
- **Context:** "Thanos" is the name of a CNCF Incubating project (Prometheus long-term storage) that OpenShift itself ships in its monitoring stack (Thanos Querier). It is also a Marvel character.
- **Decision (recommended):**
  - Keep "Thanos" as an internal codename.
  - Run trademark clearance and choose a public name before any public launch or pilot contract.
  - Keep the YAML `apiVersion` group and label prefix as placeholders until then.
- **Status:** needs founder sign-off. See [14](14-competitive-and-naming-assessment.md).
