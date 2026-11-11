# 08 — API and Integration Contracts

> Status: **Draft.** This document defines resources, conventions and representative payloads. The OpenAPI file (`api/openapi.yaml`) is written in roadmap Phase 2 from this document and becomes the source of truth. Endpoints for concepts not yet in the domain model (templates marketplace, Git sync, processing) are intentionally absent.
> Related: [04 Domain](04-domain-model-and-data-storage.md) · [06 Deployer Protocol](06-deployer-plugin-contract.md#7-deployer-protocol-v1-http-deployers) · [07 YAML](07-project-yaml-specification.md)

## 1. Conventions

| Concern | Rule |
|---|---|
| Base path | `/api/v1/t/{tenant}/…`. The tenant is explicit in the path and checked against token memberships. |
| AuthN | OIDC bearer access token (Authorization Code + PKCE for the UI; client credentials for automation). Agent endpoints use agent credentials only (§9). |
| AuthZ | RBAC roles per tenant, project and environment. `environment-deployer` is required to approve or deploy to an environment. Checked in the API layer through `identity.Authorize(subject, action, resource)`. |
| Content | JSON. Project documents are accepted and returned as JSON or YAML (`Content-Type: application/yaml`). |
| Errors | RFC 9457 `application/problem+json` with `code` (enumerated), `diagnostics[]` for validation failures, `traceId`. |
| Concurrency | Drafts carry `revision`. Writes require `If-Match: "<revision>"`, and a mismatch returns `412`. |
| Idempotency | `POST` creating deployments, versions or registrations accepts an `Idempotency-Key` header (24 h retention). A replay returns the original response. |
| Pagination | Cursor-based: `?limit=50&cursor=…` → `{items:[…], nextCursor}`. |
| Long-running | Deployments are resources with status, so clients poll or subscribe to `GET …/events` (Server-Sent Events). |
| Versioning | URL major version (`/v1`). Additive changes within v1. Breaking changes → `/v2` with ≥ 6 months overlap. Project document `apiVersion` is versioned independently ([07 §8](07-project-yaml-specification.md#8-schema-versioning-and-migration)). |
| Rate limits | Per token. `429` with `Retry-After`. |

## 2. Projects and versions

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/projects` | List |
| `POST` | `/projects` | Create (from empty, from import YAML, or from template version) |
| `GET` | `/projects/{p}` | Metadata + draft revision + latest version + per-environment deployed version |
| `GET/PUT` | `/projects/{p}/draft` | Read or replace the draft (JSON or YAML). `PUT` returns diagnostics but **saves even when invalid** (a draft may be incomplete). |
| `POST` | `/projects/{p}/draft:validate` | Validate without saving (for unsaved editor state) |
| `POST` | `/projects/{p}/versions` | Snapshot the draft into an immutable version. **Rejected if errors exist.** |
| `GET` | `/projects/{p}/versions/{n}` | Version (`?format=yaml`) |
| `GET` | `/projects/{p}/versions/{n}/diff?against={m}` | Semantic diff (instances, Gloves, config fields) |
| `GET` | `/projects/{p}/versions/{n}/lock?environment=dev` | Resolution lock |

**Example: save draft**
```http
PUT /api/v1/t/acme/projects/order-pipeline/draft
If-Match: "41"
Content-Type: application/yaml

apiVersion: thanos/v1alpha1
kind: Project
...
```
```json
{"revision": 42,
 "valid": false,
 "diagnostics": [
   {"code":"CONFIG_INVALID","severity":"error","path":"/spec/technologies/2/config/replicas",
    "target":{"kind":"technology","id":"orders-api"},"message":"99 is greater than the maximum of 20"}],
 "resolution": {
   "db-to-api": {"status":"resolved","realization":"R0","protocol":"pgwire/3"},
   "api-to-events": {"status":"resolved","realization":"R1","protocol":"kafka/3"},
   "events-to-archive": {"status":"resolved","realization":"R2","adapter":"core/kafka-to-s3@0.1.0"}}}
```

## 3. Technology catalog and compatibility

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/catalog/packages?category=&q=` | Palette listing (latest non-deprecated versions) |
| `GET` | `/catalog/packages/{catalog}/{name}/versions/{v}` | Full package (configSchema, ports, requirements) |
| `GET` | `/catalog/vocabulary` | Protocol, format and auth ids with descriptions |
| `POST` | `/catalog:compatible-ports` | Given a project draft and a source port, return compatible target ports in the graph |
| `POST` | `/catalog:resolve-glove` | Resolve a single prospective Glove (for the connection dialog) |

**Example: compatible ports while dragging**
```json
// request
{"draftRevision": 42, "from": {"technology":"events","port":"subscribe"}}
// response
{"candidates":[
  {"to":{"technology":"archive","port":"objects"},"realization":"R2",
   "adapter":"core/kafka-to-s3@0.1.0","protocol":"s3/2006-03-01"}],
 "blocked":[
  {"to":{"technology":"orders-db","port":"sql"},"reason":"PORT_ROLE","message":"orders-db.sql is an output port"}]}
```

Package *ingestion* is not a public tenant API in the MVP. The first-party catalog is ingested from Git by an operator-run job: `thanos catalog sync`.

## 4. Technology instances

Instances are part of the project document and have no CRUD endpoints of their own. That avoids two sources of truth. Runtime views are read-only:

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/environments/{e}/projects/{p}/instances` | Observed health per instance and Glove |
| `GET` | `/environments/{e}/projects/{p}/instances/{id}` | Conditions, outputs (non-secret), owned objects, drift |
| `POST` | `/environments/{e}/projects/{p}/instances/{id}/logs:stream` | SSE stream of pod logs (rate- and size-limited, not stored) |

## 5. Environments, clusters and agent registration

| Method | Path | Purpose | Role |
|---|---|---|---|
| `POST` | `/clusters` | Register a cluster and return a **one-time join token** (TTL 1 h) and install command | tenant-admin |
| `GET` | `/clusters/{c}` | Agent status, version, reported facts (K8s/OpenShift version, CRDs present) | viewer |
| `POST` | `/clusters/{c}:revoke-agent` | Revoke agent credential immediately | tenant-admin |
| `POST/GET/PATCH` | `/environments` | Create, list or update environment (cluster, namespace, policy) | tenant-admin |
| `GET` | `/environments/{e}/rbac` | Generated Role YAML for the agent in this namespace | tenant-admin |

**Example: register cluster**
```json
// POST /clusters {"name":"ocp-dev-eu"}
{"id":"c-8e1…","name":"ocp-dev-eu","status":"Registered",
 "joinToken":"tj_…(shown once)","expiresAt":"2026-10-09T12:00:00Z",
 "install":"oc apply -f https://cp.example/api/v1/agent-manifests/c-8e1….yaml  # then: oc -n thanos-agent create secret generic thanos-join --from-literal=token=…"}
```

**Example: environment policy**
```json
{"name":"dev","clusterId":"c-8e1…","namespace":"payments-dev",
 "policy":{"requireApproval":false,"requireDigest":false,"allowedRegistries":["registry.example.com"],
           "egressAllowList":["s3.storage.example.internal"],"maxCpuPerInstance":"4","driftPolicy":"report"}}
```

## 6. Deployment planning and execution

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/deployments` | Create a plan for `{project, version, environment}` → `status: Planned`. Requires `Idempotency-Key`. |
| `GET` | `/deployments/{d}` | Plan, diff, status, steps |
| `POST` | `/deployments/{d}:approve` | Start execution (role: environment-deployer, plus acknowledgments if the plan requires them) |
| `POST` | `/deployments/{d}:cancel` | Request cancellation |
| `POST` | `/deployments/{d}:retry` | New attempt of failed/remaining steps |
| `POST` | `/deployments` with `{"action":"delete"}` | Plan an undeploy of the project from the environment |
| `GET` | `/deployments/{d}/events` | SSE stream of step transitions |
| `GET` | `/deployments?environment=&project=&status=` | History |

**Example: plan**
```json
// POST /deployments  (Idempotency-Key: 5d0c…)
{"project":"order-pipeline","version":7,"environment":"dev"}
// 201
{"id":"d-31f…","status":"Planned","project":"order-pipeline","version":7,"environment":"dev",
 "requiresApproval":true,
 "acknowledgments":[{"id":"stateful-no-rollback","message":"orders-db (core/postgresql) does not support rollback; data is never rolled back."}],
 "diff":{"create":["orders-db","events","archive","orders-api","glove/api-to-events","glove/events-to-archive"],
         "update":[],"delete":[],"unchanged":[]},
 "steps":[
  {"id":"preflight","type":"Preflight","dependsOn":[]},
  {"id":"apply/archive","type":"ApplyInstance","dependsOn":["preflight"]},
  {"id":"apply/events","type":"ApplyInstance","dependsOn":["preflight"]},
  {"id":"apply/orders-db","type":"ApplyInstance","dependsOn":["preflight"]},
  {"id":"glove/api-to-events","type":"ProvisionGloveResource","dependsOn":["apply/events"]},
  {"id":"apply/orders-api","type":"ApplyInstance","dependsOn":["apply/orders-db","glove/api-to-events"]},
  {"id":"glove/events-to-archive","type":"ApplyAdapter","dependsOn":["glove/api-to-events","apply/archive"]},
  {"id":"verify","type":"VerifyHealth","dependsOn":["apply/orders-api","glove/events-to-archive"]}]}
```
(`ApplyInstance` includes `WaitReady`. `InjectConnections` is folded into the consumer's `ApplyInstance` when the consumer is created in the same plan.)

**Example: status**
```json
{"id":"d-31f…","status":"PartiallyApplied","attempt":1,
 "steps":[{"id":"apply/orders-db","status":"Succeeded","finishedAt":"…"},
          {"id":"glove/events-to-archive","status":"Failed","errorClass":"Permanent",
           "message":"KafkaConnector events-to-archive: Ready=False (ConnectorClassNotFound)"},
          {"id":"verify","status":"DependencyFailed"}]}
```

## 7. Health and logs

`GET /environments/{e}/projects/{p}/instances` returns:

```json
{"instances":[{"id":"orders-db","health":"Healthy","conditions":[{"type":"Ready","status":"True"}],"observedAt":"…"}],
 "gloves":[{"id":"events-to-archive","state":"Ready","dataPath":"Unknown","note":"data flow not observable"},
           {"id":"api-to-events","state":"Flowing","signal":{"kind":"topicEndOffsetDelta","value":1520,"window":"5m"}}],
 "drift":[]}
```

## 8. Internal contracts (not public)

| Contract | Between | Form |
|---|---|---|
| `validation.Validate(doc, catalogSnapshot, envFacts) → []Diagnostic` | projects ↔ validation | Go interface (pure) |
| `resolver.Resolve(version, catalogSnapshot, envFacts) → Lock, []Diagnostic` | validation/planner ↔ resolver | Go interface (pure, deterministic) |
| `planner.Plan(version, lock, lastApplied) → Plan` | deployments ↔ planner | Go interface (pure) |
| Agent channel `/agent/v1/poll`, `/agent/v1/reports` | control plane ↔ agent | JSON over HTTPS, versioned `v1`, agent advertises `protocolVersions` |
| Deployer Protocol v1 | agent ↔ HTTP deployer | [06 §7](06-deployer-plugin-contract.md#7-deployer-protocol-v1-http-deployers) |
| Outbox events (`project.version.created`, `deployment.status.changed`, …) | modules ↔ audit/SSE | In-process, JSON payloads |

## 9. Agent API (summary)

- `POST /agent/v1/register {joinToken, clusterFacts, agentVersion, publicKey}` → `{agentId, credential, expiresAt}`. The join token is single-use.
- `POST /agent/v1/token:refresh` → rotated credential. Revocation is checked on every call.
- `POST /agent/v1/poll`, `POST /agent/v1/reports` ([03 §6](03-system-architecture.md#6-agent-channel-protocol-summary)).
- An agent may only receive work for environments bound to its cluster. The control plane enforces this on dispatch.
