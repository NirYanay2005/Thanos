# 12 — Risk Register and Open Questions

> Review weekly ([13 §7](13-roadmap-for-three-person-team.md#7-weekly-engineering-review-template)). Severity × likelihood on a 1–3 scale. Owners: A = platform/backend, B = frontend/DX, C = infrastructure/integrations, F = founders.

## 1. Risk register

| ID | Risk | Sev | Lik | Score | Mitigation / validation | Owner | Trigger to act |
|---|---|---|---|---|---|---|---|
| R-01 | **Market:** the wiring pain isn't strong enough. Teams prefer Helm + GitOps. | 3 | 2 | 6 | Discovery interviews before Phase 4. Design-partner commitments as a go/no-go gate. Position as complement to GitOps (export). | F | < 3 design partners by week 6 |
| R-02 | **Trust:** security teams reject an in-cluster agent. | 3 | 2 | 6 | Namespaced RBAC, outbound-only, no secret values, threat model doc, consider open-sourcing the agent, self-hosted option | F + C | First security review objection |
| R-03 | **Drift noise:** operator defaulting/mutating webhooks cause false drift and SSA conflicts. | 2 | 3 | 6 | PoC-2. Compare only Thanos-owned fields via `managedFields`. Per-package ignore paths. | C | PoC-2 false-drift rate > 0 after mitigation |
| R-04 | **Operator heterogeneity:** readiness, outputs and upgrade semantics vary per operator. Templates get complex. | 2 | 3 | 6 | Small first-party catalog. CEL readiness per package. HTTP deployer escape hatch. Golden render tests. | C | > 2 packages need HTTP deployers for K8s-only tech |
| R-05 | **Adapter reliability/licensing:** the Kafka→S3 connector proves unsuitable or license-encumbered. | 2 | 2 | 4 | PoC-3, license check per connector, fallback options listed | C | PoC-3 fails |
| R-06 | **Coordinator complexity** exceeds estimate (recovery bugs). | 2 | 2 | 4 | PoC-4, kill-test suite, ADR-007 fallback to Argo Workflows in user clusters | A | > 3 engineer-weeks to stable |
| R-07 | **Scope creep:** "any technology" pressure, more packages, processing engines | 3 | 3 | 9 | Fixed MVP catalog. Every new package needs a design-partner request + go/no-go. ADR-012. | F | Any unplanned package in Phases 4–9 |
| R-08 | **AI-generated inconsistency:** agents invent divergent models or APIs. | 2 | 3 | 6 | Spec-first contracts, CODEOWNERS, bounded tasks, architecture context pack, contract tests ([13 §5](13-roadmap-for-three-person-team.md#5-ai-assisted-workflow)) | A | Two PRs with conflicting types in a week |
| R-09 | **Naming/trademark** conflict (CNCF Thanos, Marvel) | 2 | 3 | 6 | Codename only, clearance search, rename before public pilot | F | Before any public material |
| R-10 | **Platform owner risk:** Red Hat extends Topology/RHDH into composition. | 3 | 1 | 3 | Differentiate on cross-technology semantics and external services, integrate with RHDH | F | Red Hat announcement |
| R-11 | **UX comprehension:** push/pull ports confuse users. | 2 | 2 | 4 | PoC-6. Presentation changes don't change the model. | B | PoC-6 < 4/6 |
| R-12 | **OpenShift specifics** (SCC, OLM modes, Routes) break kind-tested flows. | 2 | 2 | 4 | Weekly OpenShift E2E from Phase 6. `restricted-v2`-compatible images from day one. | C | First OpenShift E2E failure class |
| R-13 | **Key-person dependency** (3-person team) | 3 | 2 | 6 | Pairing on critical paths, ADRs, documented runbooks, cross-review rule | All | Anyone unavailable > 1 week |
| R-14 | **Secret UX friction:** users must pre-create Secrets. | 1 | 3 | 3 | Generated `oc create secret` commands, preflight checks, ESO docs | B | Pilot feedback |
| R-15 | **Status overclaim:** UI suggests data flows when it doesn't. | 2 | 2 | 4 | "Flowing" requires a signal. Explicit `Unknown`. AC-H1. | B + C | Any bug report of wrong status |
| R-16 | **Agent version skew** across customer clusters | 2 | 2 | 4 | Agent N-1 compatibility, version in reports, upgrade prompts | C | Second agent release |

## 2. Open questions requiring founder input

| # | Question | Default if no answer | Needed by |
|---|---|---|---|
| Q1 | Accept replacing Argo Workflows with the native coordinator for the MVP ([ADR-007](10-architecture-decision-records.md#adr-007-deployment-orchestration))? | Native coordinator, re-evaluated after PoC-4 | End of Phase 1 |
| Q2 | Hosted SaaS control plane, self-hosted, or both for pilots? | Both from the same artifact. First pilots self-hosted if they are regulated. | Phase 2 |
| Q3 | Initial segment: data platform teams on OpenShift (recommended) or broader? | Data platform teams on OpenShift | Before Phase 4 |
| Q4 | Public name and trademark clearance budget | Codename only. No public launch until resolved. | Before first public pilot |
| Q5 | Open-source strategy: agent, package schema, catalog, whole product? | Open package schema + first-party catalog; agent source-available for security review | Phase 6 |
| Q6 | Business model hypothesis to test with design partners (see pitch) | Per-environment subscription, self-hosted license | Pilot negotiations |
| Q7 | Plain Kubernetes (non-OpenShift) support in MVP? | Works on kind for testing. Officially OpenShift-first. | Phase 6 |
| Q8 | Are design partners willing to pre-install operators? | Yes (assumption A4 check) | Discovery |

## 3. Open technical questions (team-owned)

| # | Question | Resolution path |
|---|---|---|
| T1 | Exact Strimzi CR shapes (KafkaNodePool, KafkaConnect build) for the current version | PoC-2/3 |
| T2 | Topic end-offset signal: an agent Kafka admin client vs. Strimzi/metrics | PoC-3 |
| T3 | OpenAPI 3.1 vs 3.0 generator support (`oapi-codegen`) | Phase 2 spike (½ day) |
| T4 | Secret existence check with metadata-only RBAC | PoC-1 |
| T5 | Is discovery readable without extra RBAC on OpenShift? | PoC-1 |
| T6 | Glove config schema per binding (e.g. topic settings): where declared? Proposal: `bindings[].configSchema` in package v1alpha2. | Phase 5 design note |
| T7 | Should SSE pass through corporate proxies for the UI, or is polling the fallback? | Phase 7 |
