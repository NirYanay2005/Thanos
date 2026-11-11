# 01 — Product Requirements

> Status: **Product hypothesis.** Customer statements below are *assumptions to validate* with design partners. No customer interviews have been conducted yet.
> Related: [02 MVP](02-mvp-scope-and-acceptance-criteria.md) · [14 Competition & naming](14-competitive-and-naming-assessment.md)

## 1. Product definition

Thanos (codename) is a **control plane for visually composing, validating, deploying and observing a stack of technologies inside infrastructure the customer owns**.

Users place technologies on a canvas, configure them through generated forms, and connect them with **Gloves**: typed connections whose compatibility is computed from declared capabilities. Thanos turns the design into a versioned declarative project, plans the deployment, and executes it in the customer's OpenShift/Kubernetes cluster through an outbound-only agent. It then reports health, data-path status and drift.

## 2. Fact / assumption / recommendation register

| # | Statement | Type |
|---|---|---|
| F1 | OpenShift is a large, growing platform (IBM: ~$1.9 B ARR, > 30% growth, Q4 2025). | Fact (sourced) |
| F2 | Operators for core data technologies exist and are mature (CloudNativePG: CNCF Sandbox; Strimzi: CNCF Incubating, KRaft-only). | Fact (sourced) |
| F3 | No surveyed tool combines a canvas, capability-validated connections and deployment into user-owned OpenShift. | Fact about our search, **not** proof of absence |
| A1 | Platform/data engineering teams on OpenShift spend significant time wiring Postgres/Kafka/object storage/services across environments. | **Assumption.** Validate in discovery interviews (target: 12 interviews). |
| A2 | These teams will accept an in-cluster agent with namespaced RBAC. | **Assumption.** Validate with 3 security reviews. |
| A3 | Explaining *why* things can't connect is valued more than "auto-magic". | Assumption |
| A4 | A narrow catalog (~5–8 packages) is enough for a meaningful pilot. | Assumption |
| R1 | Start with **data/streaming platform stacks on OpenShift**, not "any technology". | Recommendation |
| R2 | Treat Argo Workflows as optional, not foundational ([ADR-007](10-architecture-decision-records.md#adr-007-deployment-orchestration)). | Recommendation, needs founder sign-off |
| R3 | Rename before public launch ([ADR-014](10-architecture-decision-records.md#adr-014-product-name)). | Recommendation, needs founder sign-off |

## 3. Initial customer profile (hypothesis)

- **Organization:** mid-to-large enterprise or regulated company (finance, telco, public sector, healthcare) already running **Red Hat OpenShift** on-premises or in a private cloud, with Kubernetes operators approved for Postgres and Kafka.
- **Team:** a **platform team** (3–10 people) serving **many application/data teams** that repeatedly need "a service + Postgres + Kafka topics + archive to object storage" per environment.
- **Why this segment:**
  - Infrastructure ownership and trust constraints are strongest here, so our "deploy into *your* cluster, secrets never leave" design is a selling point, not overhead.
  - OpenShift standardizes the substrate (OLM, SCCs, Routes), which narrows our compatibility surface.

## 4. Primary user and job to be done

- **Primary user:** *platform engineer / data platform engineer* (designs and approves stacks).
- **Secondary:** *application developer* who self-serves an approved template, and *tenant admin* who registers clusters and policies.
- **Job:** "When a team needs a new data pipeline environment, I want to assemble it from approved building blocks and have the wiring (endpoints, credentials, topics, connectors) done correctly and consistently, so that I don't hand-write and debug the same glue YAML for every team and environment."

## 5. The painful workflow today (hypothesis, to validate)

1. Read each operator's docs; write CRs (CNPG `Cluster`, Strimzi `Kafka`/`KafkaTopic`/`KafkaUser`/`KafkaConnect`).
2. Figure out service names, ports and generated secret names, and wire them into app Deployments by hand.
3. Choose and license-check a Kafka→S3 connector; build a Connect image; configure DLQ.
4. Repeat for dev/staging/prod with slightly different settings; maintain it in Helm/Kustomize.
5. When something breaks, determine which link failed: CR not ready? Wrong secret key? Connector class missing?

**Thanos replaces steps 1–3** with catalog packages and Gloves, **step 4** with environments and overrides, and **step 5** with per-Glove status and explanations.

## 6. Why Thanos instead of manual wiring

| Need | Manual (Helm/YAML/GitOps) | Thanos |
|---|---|---|
| Correct wiring between technologies | Tribal knowledge | Computed from capabilities, explained when impossible |
| Consistency across teams | Copy-paste templates | Versioned packages + project templates |
| Safety before deploy | Find out at runtime | Structural + semantic + preflight validation, plan diff |
| Day-2 visibility | Per-resource dashboards | Per-technology and per-connection status, drift |
| Infrastructure ownership | ✓ | ✓ (agent in your cluster, no secret values leave) |

**What Thanos does *not* replace:** the operators, the cluster's GitOps pipeline for application code, observability stacks, or data processing logic.

## 7. Future processing capabilities

**Requirement:** support processing engines later without redesign. **Not in MVP** ([ADR-012](10-architecture-decision-records.md#adr-012-mvp-processing-scope)).

| Engine | Workload fit | State | Kubernetes maturity | Ops cost | Fit as Thanos component |
|---|---|---|---|---|---|
| **Apache Flink** (2.x; official Flink Kubernetes Operator 1.16) | Stateful streaming, event-time, windowing; also batch | Managed state + checkpoints/savepoints | **High** (official operator, stateful upgrades, autoscaling) | High | Technology package (`FlinkDeployment` CR) with ports; job artifact = container image. Best candidate for "real" stream processing. |
| **Apache NiFi** (2.x) | Flow-based routing, enrichment, protocol mediation, ingestion; visual flows | FlowFile repos, provenance | **Medium-low**: no Apache-official operator found; community NiFiKop (NiFi 2 support *not verified*) | Medium-high | A technology whose internal flow is designed in NiFi's own UI. Overlaps with our canvas in confusing ways, so it's a weaker fit. |
| **Kafka Streams** | Stream transforms inside an application | RocksDB + changelog topics | N/A (library) | Low (just an app) | Already supported: a user container with Kafka ports |
| **Kafka Connect** | Moving data in/out of Kafka; SMTs for light transforms; DLQ for sinks | Offsets in Kafka | High via Strimzi | Medium | Already the MVP adapter runtime |
| **Redpanda Connect** (ex-Benthos) | Stateless routing/transforms, many connectors, YAML config | Stateless | Medium (single binary) | Low | Strong candidate for **generic adapters** (format conversion, HTTP↔Kafka). Note mixed licensing (Apache-2.0 core + Redpanda Community License enterprise connectors). |
| **Apache Camel K** | Integration routes (EIPs) | Mostly stateless | Medium. Project active; long-term status *not verified* | Medium | Possible adapter runtime; lower priority |

**Overlap vs. fundamental difference:**
- NiFi, Redpanda Connect, Camel and Kafka Connect overlap on *moving and routing* data.
- Flink and Kafka Streams are fundamentally different: *stateful computation* with exactly-once state semantics.

**Design now:** nothing beyond what exists. Processing engines fit as technologies (with ports) or adapters (R3), and package-level fields carry their specifics.

**Defer:**
- job/flow artifact management (savepoints, upgrade modes);
- a processing-specific UI;
- schema registry integration.

**Avoid now:** a generic "Processor" abstraction, a transformation DSL, or embedding a processing engine in the control plane.

## 8. Scope

**In (product, eventually):**
- canvas;
- catalog of technologies and adapters;
- Gloves with capability resolution;
- environments and overrides;
- plan/approve/deploy/retry/cancel/undeploy;
- status, drift, logs;
- templates;
- RBAC, audit;
- self-hosted and hosted control plane.

**Out (explicitly):**
- running user data through Thanos-owned infrastructure;
- building a data integration product (connector count race);
- replacing GitOps for application code;
- installing or upgrading operators (MVP);
- hosting customer clusters.

## 9. Challenges to the original concept (deliberate)

1. **Four Glove modes → two port axes.** Simpler, complete, and it explains when adapters are needed ([05 §2](05-glove-interoperability-model.md#2-resolving-the-four-original-modes)).
2. **"Kafka-to-S3" is not a transport.** It's a sink adapter. HTTP/2 is a framing layer, not a delivery contract.
3. **Argo Workflows is not the right backbone** for multi-cluster, firewall-friendly, continuously observed deployments ([ADR-007](10-architecture-decision-records.md#adr-007-deployment-orchestration)).
4. **"Any technology to any technology" is a direction, not an MVP claim.** The MVP proves the mechanism on ~4 technologies and 1–2 adapters.
5. **The name collides** with an OpenShift-shipped CNCF project ([14 §5](14-competitive-and-naming-assessment.md#5-naming-assessment-thanos)).

## 10. Non-functional requirements (MVP)

| Area | Requirement |
|---|---|
| Validation latency | Draft validation p95 < 1 s for 50-node projects |
| Canvas | Smooth editing (≥ 30 fps) at 200 nodes / 400 edges (PoC-5) |
| Deployment of example pipeline | < 15 min on a warm cluster (operators installed, images cached) |
| Availability (hosted MVP) | Best effort, single region. Deployed workloads unaffected by control-plane outages. |
| Security | All MVP items in [09](09-security-and-trust-boundaries.md) |
| Supportability | Every failure visible in the UI with step, reason and suggested action |
