# 06 — Deployer & Extension Contract

> Status: **Recommended design.** Deployer Protocol v1 is a draft. Freeze it after PoC-4.
> Related: [05 Gloves](05-glove-interoperability-model.md) · [09 Security](09-security-and-trust-boundaries.md) · [ADR-004](10-architecture-decision-records.md#adr-004-deployer-plugin-interface) · Schema: [`package.v1alpha1.schema.json`](schemas/package.v1alpha1.schema.json)

## 1. Problem

Technologies are deployed in fundamentally different ways:
- Operator custom resources whose controllers do the real work.
- Plain workloads from container images.
- External services reached only through vendor APIs.

The core must stay stable as technologies are added, must never run third-party code in the control plane, and must not force every integration through one mechanism for the sake of uniformity.

## 2. Options compared

| | **A. In-process plugin SDK** (Go plugins / compiled-in modules) | **B. Remote HTTP deployer for everything** | **C. Kubernetes-native: one controller per technology** (watches a `ThanosInstance` CRD) | **D. Hybrid: declarative packages + built-in Kubernetes driver + HTTP Deployer Protocol for external APIs** |
|---|---|---|---|---|
| Developer experience | Go only, must match core build | Any language, but a service is needed even for "apply this CR" | Write and operate a controller per technology. Steep. | **Most technologies are YAML only.** Code is needed only for external APIs (any language, SDK helps). |
| Trust boundary | **Third-party code inside the control plane.** Violates a hard requirement. | Code runs out-of-process (good). Placement must be decided. | In user cluster (good) | Package templates are data rendered by CEL in the agent. Deployer code runs in the user cluster. |
| Failure modes | Plugin crash = control-plane crash | Extra network hop and service per technology | Many controllers to upgrade | One built-in driver (well tested) + isolated deployer pods |
| Versioning | ABI coupling to core | Protocol versioning (clean) | CRD versioning per technology | Package schema version + protocol version |
| Ops complexity | Low infra, high coupling | N services | N controllers + CRDs (cluster-admin to install CRDs) | 1 agent + only as many deployer pods as external technologies |
| Extensibility | Poor | Good | Good but heavy | Good: covers operators, containers, Crossplane/ACK resources (just more CRDs) and arbitrary APIs |

**Decision: D (hybrid).** Two execution mechanisms, chosen by `spec.deployer.kind`:

- **`kubernetes`.** The agent's built-in driver renders the package templates and applies them with Server-Side Apply. This covers **Operator-managed technologies** and **container workloads**, and incidentally any Kubernetes-API-driven provisioner the user already runs (Crossplane, AWS Controllers for Kubernetes) without new code.
- **`http`.** A **Deployer Protocol v1** service, run by the agent as a pod in the user's cluster, handles technologies only reachable through external APIs.

The Operator model is *not* a third mechanism. An operator technology is a `kubernetes` package with `requires.crds`, `requires.operator`, and CEL readiness over the CR's status.

## 3. The common contract (all deployer kinds)

Every package declares the following. The agent and control plane treat both kinds through the same internal interface.

| Contract element | Declared as | `kubernetes` kind implemented by | `http` kind implemented by |
|---|---|---|---|
| Metadata & identity | `metadata.catalog/name/version` | — | `GET /v1/describe` must echo the same identity |
| Config schema & validation | `spec.configSchema` + `spec.validations` (CEL) | Control plane (static) | Control plane (static) + optional `POST /v1/validate` for remote checks (e.g. "bucket name taken") |
| Capability discovery | `spec.ports` / `dynamicPorts` | Static | Static. `describe` may *narrow* (never widen) capabilities at runtime. |
| Deployment planning | — | SSA **dry-run** → field diff | `POST /v1/plan` → change list |
| Deploy / update | `lifecycle.update` | SSA apply (field manager `thanos-agent`) | `POST /v1/apply` (idempotent) |
| Status & health | `spec.readiness` | kstatus or CEL over primary object | `POST /v1/status` |
| Outputs (for Gloves) | `spec.outputs` (CEL templates) | Evaluated against live objects | Returned by `apply`/`status` |
| Deletion | `lifecycle.delete` + instance `deletionPolicy` | Delete owned objects (respecting `Retain`) | `POST /v1/delete` |
| Version compatibility | `requires.{thanosAgent,kubernetes,openshift,crds}` + `deployer.http.protocolVersion` | Preflight checks via discovery API | Preflight + `describe.protocolVersions` |
| Error reporting | — | Mapped from API errors and conditions | RFC 9457 problem details + `retryable` |
| Auth & secrets | `x-thanos-secret` config fields → `secretRef` | Rendered as `secretKeyRef` in manifests. Values never read by agent. | Deployer mounts `deployer.http.credentialsSecret`. Instance-level secretRefs are passed **by name**, and the deployer reads them via its own ServiceAccount where needed. |

## 4. Kubernetes driver semantics

1. **Render.** Templates are YAML with `${…}` **CEL** expressions. Bindings available: `instance` (name, id), `config` (with env overrides and defaults applied), `connections.<port>` (resolved Glove outputs), `env` (namespace, environment name), `glove` (for adapters). A string that is exactly one expression keeps its type, so `replicas: "${config.replicas}"` renders as an integer. CEL cost limits apply, and there are no loops or I/O.
2. **Stamp.** Labels `thanos.example/{project,instance,deployment}`, annotation `thanos.example/intent-hash`. Namespace is forced to the environment's target namespace. **Cluster-scoped kinds are rejected** at ingestion (MVP).
3. **Preflight.** Discovery confirms each GVK is served. `SelfSubjectAccessReview` checks each verb. SSA dry-run checks admission (catches SCC/quota/webhook rejections before anything is created).
4. **Apply.** SSA with `force: true` only for fields Thanos owns. Conflicts with other managers are reported as drift and not overwritten silently. *(PoC-2 validates this policy against CloudNativePG and Strimzi defaulting webhooks.)*
5. **Ready.** `kstatus` (`Current` = ready) for standard kinds. Package CEL rule over the **primary** object for CRDs. Requires `status.observedGeneration == metadata.generation` when present.
6. **Outputs.** CEL templates evaluated after ready, and only non-secret values are reported (Secret *names* allowed).
7. **Delete.** Owned objects are deleted in reverse template order. Operators' finalizers are respected. Waiting is bounded by the readiness timeout and then reported as `Terminating`.

## 5. Operator integration specifics

| Question | MVP answer | Later |
|---|---|---|
| Who installs the operator? | **The user** (`installPolicy: UserManaged`). Thanos shows the package's `requires.operator.packageName/channel` and a link. Preflight fails with an actionable message if the CRDs are missing. | `ThanosManaged` via OLM v1 `ClusterExtension` (GA since OpenShift 4.18). It uses its own least-privilege ServiceAccount and needs one-time admin approval, because installing CRDs is cluster-scoped. OLM v1 currently supports only the AllNamespaces install mode and no webhooks. Check per operator. |
| Discovery | Discovery API (`/apis/<group>/<version>`, 404 if absent). Assumption: readable by any authenticated user via the default `system:discovery` role, so no extra RBAC is needed. *Verify on OpenShift.* | Read OLM `ClusterExtension`/`Subscription` status for version info (read-only RBAC). |
| OpenShift/K8s version compatibility | `requires.kubernetes/openshift` ranges, checked at preflight from `/version` and (on OpenShift) `ClusterVersion` if readable, otherwise a warning. | — |
| CRD dependencies | `requires.crds` (group/kind/version) | Version-skew warnings when a CRD stops serving a version |
| Namespace / RBAC / SA | Agent gets a namespaced **Role** in each target namespace, generated from the union of GVKs in enabled catalog packages (`thanos agent rbac --namespace X` prints it). | — |
| CR creation & reconciliation | SSA apply. The operator reconciles. Thanos observes. | — |
| Readiness & failures | CEL over CR `status.conditions`. Operator `Ready=False` reason/message is surfaced verbatim (sanitized). | — |
| Upgrades | *CR spec* changes are normal updates. *Operator* upgrades are the user's business (OLM channels/approval). Thanos flags when a CRD version it uses disappears. | — |
| Deletion | CR deleted (unless `Retain`). The operator's finalizers clean up. **Thanos never deletes CRDs or operators.** | — |
| Rollback | Package `lifecycle.rollback`. Stateful operators default to `unsupported`: re-applying an old spec may be rejected (e.g. storage shrink) or unsafe. | — |
| No cluster-admin | Achieved in MVP: namespaced Role + discovery. Cluster-admin is only needed by the *user* to install operators, which they already do. | ThanosManaged install requires admin approval of a scoped ServiceAccount. |

**Illustrative walkthrough (`core/postgresql`)**

Preflight → `postgresql.cnpg.io/v1 Cluster` served ✓, `create clusters.postgresql.cnpg.io` allowed in `payments-dev` ✓. Apply the `Cluster` CR. Wait for the `Ready` condition (CEL, 10 min). Outputs are `host=orders-db-rw.payments-dev.svc`, `credentialsSecret=orders-db-app`. The Glove `db-to-api` (R0) re-renders orders-api with `PGHOST` and `secretKeyRef(orders-db-app, password)`.

## 6. User-provided code or service

| Source | MVP? | Notes |
|---|---|---|
| **Container image** | **Yes** | `core/container` package. Non-dev environments require a **digest-pinned** image from an **allowed-registries** list (environment policy). The pod must run under OpenShift `restricted-v2` (non-root, no added capabilities). Resource requests/limits are defaulted from a profile. Health comes from `healthPath`, and secrets are injected via `secretKeyRef`. Rollback = re-apply previous version (Deployment rollout). |
| **Existing service** (already running, Thanos only connects to it) | **Yes, cheap** | `core/external-endpoint` package. It is `kubernetes` kind with zero templates and outputs from config (host, port, Secret name). It has ports, so it participates in Gloves, but Thanos deploys nothing. |
| **Build from source** | **No (post-MVP)** | When added: Shipwright / Builds for Red Hat OpenShift, **in the user's cluster**, pushing to the user's registry, optional cosign signing. Builds are never in the control plane. |

## 7. Deployer Protocol v1 (HTTP deployers)

**Placement:** the deployer runs as a pod in the agent's namespace (or a namespace the user chooses), launched by the agent from the digest-pinned `deployer.http.image`. Only the agent calls it (cluster-local Service + NetworkPolicy + shared bearer token from a Secret the agent creates). Vendor-hosted remote deployers are post-MVP, because they would require sending credentials outside the cluster.

**Conventions:**
- JSON over HTTP.
- `Content-Type: application/json`.
- Errors as `application/problem+json` (RFC 9457) with an extra `retryable: bool` and an optional `field` (JSON Pointer).
- Every mutating call carries `Idempotency-Key: <deploymentId>/<stepId>`.
- Long operations return `202` with an `operationId`.
- Timeouts: the agent waits 30 s per request and polls operations up to the package readiness timeout.

| Method & path | Purpose | Request | Response |
|---|---|---|---|
| `GET /v1/describe` | Identity, protocol versions, optional narrowed capabilities | — | `200 {package:{catalog,name,version}, protocolVersions:["v1"], operations:["validate","plan","apply","status","delete"], capabilities?:{ports:[…]}}` |
| `POST /v1/validate` | Remote validation | `{instance, config, environment}` | `200 {diagnostics:[{severity, field, message}]}` |
| `POST /v1/plan` | Compute changes | `{instance, config, lastApplied?, environment}` | `200 {changes:[{action:"create"\|"update"\|"replace"\|"delete"\|"noop", resource, summary, destructive}]}` |
| `POST /v1/apply` | Converge to desired | `{instance, config, environment}` | `200 {state:"Ready", outputs:{…}}` or `202 {operationId}` |
| `GET /v1/operations/{id}` | Poll | — | `200 {state:"Running"\|"Succeeded"\|"Failed", outputs?, error?}` |
| `POST /v1/status` | Observe | `{instance, config}` | `200 {health:"Healthy"\|"Degraded"\|"Unhealthy"\|"Unknown", conditions:[…], outputs:{…}, drift?:[…]}` |
| `POST /v1/delete` | Remove (honouring `deletionPolicy`) | `{instance, config, deletionPolicy}` | `200 {state:"Deleted"\|"Retained"}` or `202 {operationId}` |

`instance` = `{id, name, project, environment, uid}`. `config` contains secretRefs **by name** only.

**Example: S3 bucket deployer apply**

```http
POST /v1/apply HTTP/1.1
Idempotency-Key: 7f3c…/step-archive-apply
Authorization: Bearer <agent-to-deployer token>

{"instance":{"id":"archive","name":"order-pipeline-archive","project":"order-pipeline","environment":"dev","uid":"b4b2…"},
 "config":{"endpoint":"https://s3.storage.example.internal","region":"us-east-1","bucket":"acme-order-archive",
           "createIfMissing":true,"credentials":{"secretRef":{"name":"archive-s3-credentials","key":"credentials"}}},
 "environment":{"namespace":"payments-dev"}}
```
```json
{"state":"Ready","outputs":{"endpoint":"https://s3.storage.example.internal","bucket":"acme-order-archive","credentialsSecret":"archive-s3-credentials"}}
```

**Error example**
```json
{"type":"https://thanos.invalid/problems/external-api","title":"Bucket name already owned by another account","status":409,
 "detail":"S3 returned BucketAlreadyExists","retryable":false,"field":"/config/bucket"}
```

**Rate limits & retries:** deployers must translate upstream `429`/`503` into `retryable: true` with an optional `retryAfterSeconds`. The agent applies backoff (max 3 attempts per step, then the step fails as `Transient`). Deployers must be safe to call `apply` repeatedly.

**Reconciliation:** the agent calls `status` on the observation interval (default 10 min). `drift` in the response is reported like Kubernetes drift.

## 8. Authoring a new technology without touching the core

1. Write `package.yaml` (validate locally: `thanos pkg lint package.yaml`, which runs the same schema, CEL compile and vocabulary checks as ingestion).
2. For external APIs: implement Deployer Protocol v1 (the Go SDK `thanos-deployer-sdk` provides handlers, idempotency store, problem-details helpers) and run the **conformance suite** (`thanos-deployer-conformance --url …`, which calls each endpoint with valid, invalid and repeated requests).
3. Publish: push to the catalog Git repo (MVP: first-party catalog, PR-reviewed) or as an OCI artifact (post-MVP).
4. Ingestion checks schema, vocabulary, semver-vs-diff, image digest pinning, and no cluster-scoped templates.
5. The package appears in the palette, and its ports immediately match existing technologies and adapters. **No core code changes.**

**Registration, updates and removal:**
- Package versions are immutable once ingested.
- A new version is a new row. Existing project locks keep their version until upgraded.
- "Removing" a package marks it `deprecated` (hidden from the palette, still usable by existing projects) or `revoked` (security: deployments blocked, users notified).
- MVP: third-party catalogs are disabled. Only the first-party catalog is enabled, since trust tiers are post-MVP ([09 §8](09-security-and-trust-boundaries.md#8-deployer-and-package-trust)).
