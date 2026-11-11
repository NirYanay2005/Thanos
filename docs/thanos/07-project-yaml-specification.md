# 07 — Project YAML Specification (`thanos/v1alpha1`)

> Status: **Draft public API.** Schema: [`schemas/project.v1alpha1.schema.json`](schemas/project.v1alpha1.schema.json). Full example: [`examples/order-pipeline.project.yaml`](examples/order-pipeline.project.yaml), validated by [`examples/check_examples.py`](examples/check_examples.py).
> The `apiVersion` group `thanos` is a placeholder until the product name is settled ([14](14-competitive-and-naming-assessment.md)).

## 1. Principles

1. **Desired state only.** The document says *what* should exist and how it connects, never *how* to deploy it. There are no manifests, CR fields, connector classes or step lists. Those come from packages and the planner.
2. **Secret values are illegal.** Secrets are referenced as `{secretRef: {name, key}}` pointing at Kubernetes Secrets in the target namespace.
3. **The canvas is a projection of this document.** Anything visible on the canvas is in the document. `layout` is the only non-semantic section.
4. **Derived data is not authored.** Resolution choices, pinned package versions and plan steps live in the **lock** (§5), not in the project.

## 2. Document structure

```yaml
apiVersion: thanos/v1alpha1     # required, exact
kind: Project                   # required
metadata:
  name: order-pipeline          # DNS label, unique per tenant
  displayName: Order pipeline
  description: …
  labels: {team: payments}
spec:
  technologies: [ … ]           # 1..200 technology instances
  gloves: [ … ]                 # 0..500 connections
  environments: [ … ]           # environments this project may deploy to, with overrides
layout:                         # optional, non-semantic (node positions)
  nodes: {orders-db: {x: 80, y: 260}}
```

### 2.1 `spec.technologies[]`

| Field | Req. | Meaning |
|---|---|---|
| `id` | ✓ | DNS label (≤ 40 chars), unique in project, stable. The runtime name is `<project>-<id>` unless the package overrides it. |
| `package` | ✓ | `<catalog>/<name>@<range>`; range `^1.2`, `~1.2.3` or exact. Resolved to an exact version in the lock. |
| `config` | | Validated against the package's `configSchema` + CEL `validations`. |
| `resources` | | `profile` (small/medium/large) or explicit `cpu`/`memory`/`storage`. The package maps these to its manifests. |
| `dependsOn` | | Extra ordering edges (Glove-derived ordering is automatic). |
| `deletionPolicy` | | `Retain` \| `Delete`. Defaults to `Retain` for `stateful` packages. |
| `health` | | `readinessTimeout` override, and `required: false` to not block dependents. |

### 2.2 `spec.gloves[]`

| Field | Req. | Meaning |
|---|---|---|
| `id` | ✓ | DNS label, unique in project. |
| `from` / `to` | ✓ | `{technology, port}`. `from` must be an output port and `to` an input port ([05 §2](05-glove-interoperability-model.md#2-resolving-the-four-original-modes)). |
| `binding` | | `auto` (default) or a pin: `protocol`, `format`, `via` (broker technology id), `adapter` (package ref). |
| `config` | | Binding/adapter-specific (e.g. `topic`, `partitions`, `prefix`, `sourceGlove`). Validated against the selected binding's or adapter's schema. |
| `delivery` | | `guarantee` (`at-most-once` \| `at-least-once`), `deadLetter: bool`. |

### 2.3 `spec.environments[]`

| Field | Req. | Meaning |
|---|---|---|
| `name` | ✓ | References an **Environment** registered in the control plane (cluster + namespace + policies). The project does not embed cluster details. |
| `overrides` | | Map `technologyId → JSON Merge Patch (RFC 7386)` over that technology's `config`. Overrides cannot add technologies or Gloves. |

**Why environments are referenced, not defined, here:** clusters, namespaces, agent identities and approval policies belong to the tenant admin and to infrastructure ownership ([09](09-security-and-trust-boundaries.md)). A project YAML can be shared or imported between tenants without leaking infrastructure.

## 3. Secret and configuration references

- A config property is a secret if the package schema marks it `x-thanos-secret: true`. Such properties **must** be `secretRef` objects. Plain strings fail validation.
- Additionally, a heuristic linter flags *any* string config value that looks like a credential: high-entropy strings ≥ 20 chars, PEM blocks, `AKIA…` prefixes, `password=` patterns. In the UI this is a blocking error with "move to Secret" guidance. Via the API it is a warning unless the environment policy says `strict`.
- Preflight verifies that the referenced Secret **exists** and has the key, using `get` on the Secret's metadata, without reporting the value to the control plane. *(PoC-1: confirm RBAC allows metadata-only checks. Otherwise the agent reads but never transmits.)*

## 4. Validation stages and diagnostics

| Stage | Checks | Runs where |
|---|---|---|
| 0. Parse | YAML 1.2 subset: no anchors/aliases (billion-laughs protection), no custom tags, max 1 MiB, max depth 32 | API |
| 1. Structural | JSON Schema 2020-12 (project schema) | UI (Ajv) + API (authoritative) |
| 2. Referential | Unique ids. Glove ends, `dependsOn`, `overrides`, `sourceGlove` refer to existing ids. Environments exist and the user may target them. | API |
| 3. Package | Package range resolvable. Config valid against `configSchema` with defaults applied. CEL `validations` pass. `x-thanos-secret` rule. | API |
| 4. Glove | Port roles, resolution, pins, delivery/DLQ support ([05 §6](05-glove-interoperability-model.md#6-compatibility-resolution-algorithm)) | API |
| 5. Graph | No dependency cycles. Every Glove end is deployable in each referenced environment. | API |
| 6. Policy | Environment policy: allowed registries, digest pinning, egress allow-list for external endpoints, max resources, approval rules | API |
| 7. Target (preflight) | CRDs present, RBAC, Secrets exist, agent version | Agent, at plan time |

**Diagnostic format** (stable public contract):
```json
{"code":"GLOVE_PIN_UNSATISFIABLE","severity":"error",
 "path":"/spec/gloves/2/binding/protocol",
 "target":{"kind":"glove","id":"events-to-archive"},
 "message":"Pinned protocol http/2 cannot be satisfied between events.subscribe (kafka/3, pull) and archive.objects (s3, push).",
 "hints":["Remove the pin to use adapter core/kafka-to-s3@0.1.0","Available protocols: s3/2006-03-01 via adapter"]}
```
`path` is a JSON Pointer into the canonical document, and `target` lets the UI highlight a node or edge. Codes are an enumerated, documented list (e.g. `SCHEMA_INVALID`, `UNKNOWN_REFERENCE`, `PACKAGE_UNRESOLVABLE`, `CONFIG_INVALID`, `SECRET_LITERAL`, `PORT_ROLE`, `GLOVE_NO_PATH`, `GLOVE_PIN_UNSATISFIABLE`, `CYCLE`, `POLICY_VIOLATION`, `CRD_MISSING`, `RBAC_DENIED`).

## 5. The resolution lock (derived, read-only)

Stored per `(projectVersion, environment)` and exportable as `order-pipeline.lock.yaml`:

```yaml
apiVersion: thanos/v1alpha1
kind: ProjectLock
project: order-pipeline
version: 7
environment: dev
catalogSnapshot: 2026-10-01T09:00:00Z
packages:
  orders-db: core/postgresql@1.2.0
  events: core/kafka@1.0.0
  orders-api: core/container@1.0.0
  archive: core/s3-bucket@0.3.0
gloves:
  db-to-api:        {realization: R0, protocol: pgwire/3, format: sql, auth: password}
  api-to-events:    {realization: R1, protocol: kafka/3, format: json, auth: none, provisions: topic}
  events-to-archive:
    realization: R2
    protocol: s3/2006-03-01
    format: json
    auth: aws-sigv4
    adapter: {package: core/kafka-to-s3@0.1.0, instance: order-pipeline-events-to-archive}
```

The lock is **public to read and export**, but it is not an input. Importing a project re-resolves, and the import report shows differences from an attached lock.

## 6. Canonical serialization

To make diffs, hashes and Git storage meaningful:
- Key order: fixed per schema (`apiVersion, kind, metadata, spec, layout`), then the schema property order, then alphabetical for free-form maps (`config`, `labels`).
- Arrays: `technologies` and `gloves` are sorted by `id`. Other arrays keep user order.
- Defaults are **not** materialized in the canonical project (they are in the lock), so package default changes don't create spurious diffs.
- 2-space indent, block style, strings quoted only when needed, LF line endings, trailing newline.
- `contentHash` = SHA-256 of the canonical JSON form (RFC 8785 JCS) of `apiVersion+kind+metadata+spec` (layout excluded). Used for version dedup and change detection.

## 7. Import / export

- **Export:** the canonical YAML. Optionally include the lock and `layout`. Never includes environment definitions, cluster ids or Secret values (they aren't in it).
- **Import:** parse (stage 0) → if `apiVersion` is older, **migrate** (§8) → validate → create a new draft. The import report lists migrations applied, unresolved packages and environments that don't exist in the target tenant (they are dropped with a warning).
- **Git workflow (post-MVP):** the canonical form is Git-friendly. A "sync to Git" feature can commit versions to the customer's repo.

## 8. Schema versioning and migration

- `apiVersion` follows the Kubernetes convention: `v1alpha1` (may break) → `v1beta1` → `v1`.
- The server stores **only the latest internal version**. Older documents are converted at import or API boundaries by **pure, tested migration functions** (`migrate_v1alpha1_to_v1alpha2(doc) → (doc, notes[])`), chained.
- Each migration ships with golden-file tests (input, expected output, notes).
- The API accepts the latest two versions and returns the requested one (via `Accept` or `?apiVersion=`) when a reverse conversion exists, or `406` otherwise.
- Deprecation: an `apiVersion` is supported for at least 6 months after its successor reaches beta.

## 9. Public API vs. internal detail

| Public (versioned, documented, stable within apiVersion) | Internal (may change any release) |
|---|---|
| Project document schema | Plan step types and DAG format |
| Diagnostic codes and format | Agent channel messages |
| Lock document (read-only) | Database schema |
| Package schema (for package authors) | Rendered manifests and label keys (beyond `thanos.example/instance`) |
| Deployer Protocol v1 | Resolver ranking weights (documented, not guaranteed) |
| REST API ([08](08-api-and-integration-contracts.md)) | CEL helper function set (until frozen with package schema v1beta1) |

## 10. Insecure / unsupported configuration handling

| Case | Behavior |
|---|---|
| Secret literal | Error `SECRET_LITERAL` (strict) / warning (lenient) |
| `:latest` or tag-only image outside dev | Error `POLICY_VIOLATION` (`requireDigest`) |
| Image registry not in allow-list | Error |
| External endpoint host not in the environment egress allow-list, or resolving to link-local/metadata ranges (169.254.0.0/16, etc.) | Error (SSRF guard, [09 §10](09-security-and-trust-boundaries.md#10-ssrf-and-external-endpoints)) |
| Package marked `illustrative`/`deprecated` | Warning; `revoked` → error |
| Resource request above environment max | Error |
| Unknown fields | Error (schemas are `additionalProperties: false`) |
