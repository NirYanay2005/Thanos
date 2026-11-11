# 02 — MVP Scope and Acceptance Criteria

> Status: **Recommended scope.** Acceptance criteria are the exit gate of roadmap Phase 9 ([13](13-roadmap-for-three-person-team.md)).

## 1. Hypothesis the MVP must prove

> A platform engineer can visually define a small technology pipeline, connect compatible components with Gloves, deploy it into a cluster they control, and see whether it is working, faster and with fewer wiring errors than doing it by hand.

The MVP must **not** claim universal interoperability. It proves that the *mechanism* works:
- capability declarations;
- resolution, including an adapter;
- three deployment models;
- three realization classes;
- outbound-only execution;
- honest status.

## 2. MVP technology set

| Package | Deployer model | Why it's in | What it proves |
|---|---|---|---|
| `core/container` | Kubernetes driver (plain workload) | Every pipeline has a user service | User-provided service deployment, connection injection (env/`secretKeyRef`) |
| `core/postgresql` (CloudNativePG) | Kubernetes driver (operator CR) | The most common stateful dependency | Operator prerequisites, CEL readiness, generated-secret outputs, **pull Glove (R0)** |
| `core/kafka` (Strimzi / Streams for Apache Kafka) | Kubernetes driver (operator CR) | Messaging backbone; broker as explicit node | **Push Glove with provisioning (R1)**, a technology with both Input B and Output B ports |
| `core/s3-bucket` (external API) | **HTTP deployer** (Deployer Protocol v1) | Proves the external-service model against a real API (MinIO locally, any S3-compatible store in pilots) | Remote deployer contract, egress policy, external readiness |
| `core/kafka-to-s3` adapter | Kubernetes driver (Strimzi KafkaConnect + Apache-2.0 S3 sink) | The only way to connect pull-output Kafka to push-input S3 | **Adapter resolution (R2)**, DLQ, data-path signal |
| `core/external-endpoint` | Kubernetes driver (no templates) | Connect to things Thanos doesn't deploy | Gloves to pre-existing services |

**Stretch (only if Phase 7 is on schedule):** `core/http-to-kafka` bridge adapter. It proves a *protocol bridge* (push→push) in addition to a *pump* (pull→push).

**Redundant for proving the architecture, so excluded:**
- a second database (MySQL/MongoDB) or second broker (RabbitMQ/NATS): same mechanisms;
- Redis;
- source builds;
- NiFi/Flink;
- multiple clusters per project.

## 3. In / out

| In MVP | Out of MVP (later phase) |
|---|---|
| Single tenant per pilot (multi-tenant data model enforced) | Self-service tenant signup, billing |
| Canvas: add, configure, connect, delete, undo/redo, YAML view, validation overlays | Grouping/sub-flows, collaborative real-time editing, comments |
| Project drafts, immutable versions, diff, export/import | Branches, Git sync |
| Environments (cluster + namespace + policy) with overrides | Multi-cluster projects, cross-namespace Gloves |
| Plan, approve, deploy, retry, cancel, undeploy | Scheduled deploys, canary/progressive delivery |
| Status: per instance, per Glove (configured/deployed/ready/flowing/unknown), drift report | Auto drift correction, alerting integrations, SLOs |
| Outbound agent, join token, namespaced RBAC | mTLS certificates, agent auto-upgrade |
| First-party catalog (6 packages) | Third-party catalogs, package signing, marketplace |
| Container image deployment | Source builds |
| Templates (project version marked as template) | Template parameters wizard |
| Operators: **user-installed** (preflight checks) | Thanos-managed operator install (OLM v1) |

## 4. Acceptance criteria (measurable)

All are verified by automated tests unless marked (M) for a manual check.

### 4.1 Project creation and persistence
- AC-P1: Creating, saving, reloading and re-opening a project yields an identical canonical document (round-trip test over 50 generated projects).
- AC-P2: Concurrent edits to one draft: the second writer receives `412` and the UI offers reload/merge. No silent overwrite.
- AC-P3: A version is immutable. API attempts to modify it fail, and a DB trigger blocks direct updates.
- AC-P4: Export → import into another tenant reproduces the same `contentHash` (minus environments).

### 4.2 Visual graph editing
- AC-G1: A user can build the reference pipeline (4 technologies, 3 Gloves) from an empty canvas in **≤ 10 minutes** without docs. (M: 5 test users, ≥ 4 succeed.)
- AC-G2: Undo/redo restores exact document state over a 50-operation random sequence (property test).
- AC-G3: Canvas stays ≥ 30 fps at 200 nodes / 400 edges on the reference laptop (PoC-5 benchmark in CI, Playwright trace).
- AC-G4: Every diagnostic with a `target` highlights the corresponding node, edge or form field.

### 4.3 YAML generation and validation
- AC-Y1: Canonical YAML is byte-stable: the same model produces the same bytes (golden tests).
- AC-Y2: Each diagnostic code in [07 §4](07-project-yaml-specification.md#4-validation-stages-and-diagnostics) has at least one failing fixture with the expected `code` and `path`.
- AC-Y3: YAML bombs, anchors, duplicate keys, documents > 1 MiB and depth > 32 are rejected (security fixtures).
- AC-Y4: YAML edited in the YAML view and the canvas stay consistent (switch views 20× in E2E without loss).

### 4.4 Capability discovery
- AC-C1: All 6 catalog packages pass ingestion (schema, vocabulary, CEL compile, digest-pinned images, namespaced kinds only).
- AC-C2: A mislabeled breaking change (port removed in a minor version) is rejected at ingestion.
- AC-C3: The palette and port handles are rendered from package metadata only. There are no package names in frontend code (lint rule / grep test).

### 4.5 Compatibility validation
- AC-V1: The resolver produces the expected realization for the reference project (`db-to-api` R0, `api-to-events` R1, `events-to-archive` R2 via `kafka-to-s3`), matching [`check_examples.py`](examples/check_examples.py).
- AC-V2: Resolution is deterministic: 1,000 shuffled-input runs give identical locks.
- AC-V3: Each of the 6 negative fixtures in `check_examples.py` (plus at least 10 more) returns an error with a human-readable explanation naming the failing dimension.
- AC-V4: Compatible-target highlighting responds in < 200 ms p95 for 50-node graphs.

### 4.6 Deployment planning
- AC-D1: The plan for the reference project orders steps consistent with Glove dependencies (consumer after provider, emitter after receiver, adapter after both).
- AC-D2: Re-planning an unchanged version yields zero mutating steps.
- AC-D3: A plan that deletes or touches a stateful instance requires explicit acknowledgment.

### 4.7 Successful deployment
- AC-S1: The reference project deploys to (a) `kind` with CNPG + Strimzi + MinIO in CI and (b) **one real OpenShift 4.x cluster** (M), with the agent holding only namespaced RBAC.
- AC-S2: After deployment, a test producer posting to orders-api results in objects appearing in the bucket within 5 min (E2E data-path test).
- AC-S3: Deploying version N+1 with one config change modifies only the affected instance (verified via `managedFields` / resourceVersion).

### 4.8 Health and status visibility
- AC-H1: The UI distinguishes, per Glove, **configured / deployed / ready / flowing / unknown**. "Flowing" is shown only when a data-path signal exists (tested by pausing the connector, which must show Degraded within 10 min).
- AC-H2: Manually editing an owned resource (`oc patch`) shows a drift report within the observe interval, naming the changed fields.
- AC-H3: Pod logs for an owned workload can be streamed from the UI. Nothing is persisted (DB check).

### 4.9 Failure recovery
- AC-F1: Failure injection: a missing CRD makes preflight fail with `CRD_MISSING` and nothing applied.
- AC-F2: A wrong connector config gives a `PartiallyApplied` deployment. Independent branches complete. Retry after fixing (new version) succeeds without re-running succeeded steps.
- AC-F3: Killing the control plane mid-deployment and restarting: the deployment resumes and completes, with no duplicate resources.
- AC-F4: Killing the agent mid-step: re-delivery after restart completes without duplicates.
- AC-F5: A second concurrent deploy to the same environment returns `409 EnvironmentBusy`.
- AC-F6: Cancel during a long `WaitReady` ends in `Cancelled` within 60 s.

### 4.10 Security
- AC-X1: Cross-tenant access tests: every endpoint returns 404 for foreign resources.
- AC-X2: No secret values in the DB, logs or agent reports (canary secret test: a known random value placed in a Secret is never found in DB dumps or control-plane logs after a full E2E run).
- AC-X3: The agent runs with the generated namespaced Role only. E2E fails if it needs more.
- AC-X4: An external endpoint outside the egress allow-list, or pointing at `169.254.169.254`, is rejected.
- AC-X5: CI blocks on critical vulnerabilities in images and dependencies.
- AC-X6: A STRIDE threat model for the agent channel and Deployer Protocol is reviewed, and the findings are triaged (M).

### 4.11 Documentation and onboarding
- AC-O1: A new pilot user can register a cluster and deploy the reference template following the quickstart in **≤ 60 minutes** (M, 2 pilot users).
- AC-O2: The package-author guide lets an engineer not on the core team add a new `kubernetes`-kind package (e.g. Redis) without core code changes in ≤ 1 day (M).
- AC-O3: Every diagnostic code has a docs page with cause and fix.

## 5. Demo script (pilot)

1. Register an OpenShift cluster: the join token gives an agent that is Connected.
2. Create environment `dev` → namespace `payments-dev`, with an egress allow-list.
3. New project from the "Order pipeline" template, or drag the 4 technologies.
4. Connect orders-db → orders-api. The Glove auto-resolves `pgwire/3`, R0.
5. Connect orders-api → events. Pick `kafka/3`, topic `orders.events` (R1).
6. Connect events → archive. The UI explains that both ends are passive and proposes the Kafka→S3 adapter (R2).
7. Try pinning `http/2` and see the explanation of why it is impossible.
8. Plan: review 8 steps and the stateful acknowledgment. Deploy, watching step progress.
9. Send orders. The `events-to-archive` Glove turns **Flowing** and objects appear in the bucket.
10. `oc patch` the Deployment and watch the drift report appear. Re-apply.
