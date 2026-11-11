# 11 — Testing and Validation Strategy

> Related: [02 Acceptance criteria](02-mvp-scope-and-acceptance-criteria.md) · [12 Risks](12-risk-register-and-open-questions.md) · [13 Roadmap](13-roadmap-for-three-person-team.md)

## 1. Proof-of-concept experiments

These run in roadmap Phase 1, **before** extensive implementation. Each is time-boxed. A failure changes the plan; it does not extend the timebox.

| PoC | Question | Method | Pass criteria | Fail → consequence | Owner | Timebox |
|---|---|---|---|---|---|---|
| **PoC-1 Agent channel & least privilege** | Can an outbound-only agent with a *namespaced* Role apply and observe operator CRs on real OpenShift, through an HTTP proxy? | Minimal Go agent: long-poll a stub server through a Squid proxy. SSA-apply CNPG `Cluster` + Strimzi `Kafka` in one namespace. Discovery and `SelfSubjectAccessReview`. Secret existence check. | All operations succeed with the generated Role. Discovery is readable without extra RBAC. Proxy and custom CA work. | Need ClusterRole read access → document it, re-assess A2 with security reviewers | C | 1 wk |
| **PoC-2 Operator apply, readiness, drift noise** | Are SSA + CEL readiness + dry-run drift detection reliable with operator defaulting webhooks? | Apply, re-apply ×10, modify one field, upgrade one field. Record `managedFields` conflicts and dry-run diffs. | Re-apply produces 0 diffs (no false drift). The real change is detected. Readiness CEL is correct for CNPG/Strimzi. Outputs (service/secret names) are as declared. | High false-drift rate → compare only Thanos-owned fields from `managedFields` (fallback design) | C (+A) | 1.5 wk |
| **PoC-3 Kafka→S3 adapter** | Can we build a reliable, license-clean Kafka→S3 sink on Strimzi with a data-path signal? | Strimzi `KafkaConnect` with the Aiven cloud-storage connector (Apache-2.0) → MinIO. DLQ on. Read connector/task status. | Records land in MinIO. A bad record goes to DLQ. Status distinguishes RUNNING/FAILED/PAUSED. Image build is reproducible. | Connector unsuitable → try Camel Kafka Connector / stream-reactor (verify Kafka 4 support). Else make the adapter a user container. | C | 1 wk |
| **PoC-4 Step coordinator & recovery** | Is a Postgres-backed DAG coordinator simpler and more reliable for us than Argo Workflows? | Build a minimal coordinator (SKIP LOCKED, leases, idempotency) with a fake agent. Kill tests. **Time-boxed 2-day comparison spike** of the same DAG as an Argo Workflow in kind. | Coordinator survives 100 random kill/restart cycles with no duplicate or lost steps. Code ≤ 1.5k LoC. Comparison is documented in ADR-007. | Coordinator brittle → adopt Argo Workflows in user clusters (ADR-007 option 2) | A | 1 wk |
| **PoC-5 Canvas projection & performance** | Does React Flow + document-as-truth + schema forms work at our scale? | 200 nodes / 400 edges, undo/redo via patches, forms from package `configSchema` (RJSF), YAML view round-trip | ≥ 30 fps pan/zoom. Undo/redo is exact. Forms render all sample packages. | Perf fail → viewport culling or canvas renderer for large graphs. Forms fail → custom renderer for schema subset. | B | 1 wk |
| **PoC-6 Concept comprehension** | Do target users understand ports (push/pull), Gloves and explanations? | Clickable prototype (from PoC-5) with 5–6 platform engineers. Tasks: build the reference pipeline, interpret an incompatibility. | ≥ 4/6 complete the build. ≥ 4/6 correctly explain why Kafka→S3 needs an adapter. | Rework the presentation (e.g. hide initiation, show "needs bridge"). The model stays. | B + founders | 1 wk (parallel) |
| **Discovery interviews** | Is the pain real, and who pays? | 12 interviews with OpenShift platform/data teams | ≥ 6 describe the wiring pain unprompted. ≥ 3 agree to a design-partner pilot. | Re-segment before building Phase 4+ | Founders | 3–4 wk (parallel) |

## 2. Test pyramid

| Level | Scope | Tools | When |
|---|---|---|---|
| **Unit / property** | `validation`, `resolver`, `planner`, YAML codec, migrations, CEL rendering | Go `testing`, `rapid` (property tests), golden files | Every PR |
| **Contract** | (a) REST API vs. OpenAPI spec. (b) Deployer Protocol v1 conformance suite. (c) Package golden renders: each package × fixtures → expected manifests. (d) Agent channel message schemas. | OpenAPI validator middleware in tests, Schemathesis-style fuzzing, conformance binary | Every PR |
| **Integration** | Control plane + Postgres; agent driver vs. API server | testcontainers-go (Postgres), envtest (kube-apiserver + etcd) | Every PR |
| **End-to-end** | UI → API → agent → kind with CNPG, Strimzi, MinIO | Playwright, kind, `make e2e` | Nightly + pre-release, and on PRs labeled `e2e` |
| **OpenShift E2E** | Same suite on real OpenShift (SCC, OLM-installed operators, Routes) | OpenShift sandbox/dev cluster | Weekly + pre-release |
| **Failure injection** | Kill control plane/agent mid-step, network partition (toxiproxy between agent and CP), missing CRD, webhook rejection, quota exceeded, connector crash | Scripted chaos scenarios in the E2E suite | Nightly |
| **Security** | Cross-tenant matrix, YAML bombs, SSRF fixtures, canary-secret leak test, RBAC minimality, dependency and image scanning | Go tests, `govulncheck`, Trivy/Grype, `npm audit` | PR (fast parts), nightly (full) |
| **Performance** | Validation p95, canvas fps, coordinator throughput | Go benchmarks, Playwright traces | Weekly |

**Principles:**
- The **pure core** (`validation`, `resolver`, `planner`) targets ≥ 90% branch coverage and carries most of the logic.
- Cluster tests verify integration, not logic.
- Every bug fix lands with a regression test at the lowest level that reproduces it.

## 3. Local test infrastructure

```
make dev        # docker compose: postgres, keycloak, minio; runs server + UI with hot reload
make cluster    # kind cluster + CloudNativePG + Strimzi (pinned versions) + agent (dev token)
make e2e        # full E2E against the kind cluster
make conformance URL=…  # Deployer Protocol conformance against a deployer
```

- Pin operator versions in `hack/versions.env`, so all humans and agents test the same thing.
- Seed data: the reference catalog and the `order-pipeline` example project.
- OpenShift-specific checks: OpenShift Local (CRC) on one engineer machine (resource-heavy) or a shared dev cluster.

## 4. CI workflows (GitHub Actions or equivalent)

| Workflow | Trigger | Jobs | Budget |
|---|---|---|---|
| `pr` | Every PR | lint (golangci-lint, eslint, depguard boundaries), unit, contract, integration, build images, vuln scan, `check_examples.py`-equivalent spec tests | ≤ 15 min |
| `e2e` | Nightly, label `e2e`, release branches | kind + operators + full E2E + failure injection | ≤ 60 min |
| `openshift` | Weekly, pre-release | E2E on OpenShift | ≤ 90 min |
| `release` | Tag | SBOM, sign (prod), publish images + agent manifests + catalog | — |

## 5. Testing guidance specific to AI-assisted development

- **Tests are the specification handed to agents.** For each task, the human writes or approves the acceptance tests *first* (or in the same PR, reviewed first).
- **Golden files** for YAML canonicalization, package renders, plans and diagnostics make unintended behavioral changes visible in diffs.
- **Contract files are CODEOWNERS-protected:** `api/openapi.yaml`, `schemas/*.json`, `docs/thanos/06…`, migration files. Agents may propose changes, and a named human must approve.
- **Do not let agents "fix" failing tests by weakening them.** The PR template has a checkbox, and the reviewer checks assertion diffs.
- Flaky tests are quarantined within 24 h with an issue, never silently retried.
