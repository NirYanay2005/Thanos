# 00 — Executive Summary

> Codename **Thanos**. Planning-phase blueprint, 2026-10-09. Nothing here is implemented yet. Facts, assumptions and recommendations are labeled in each document.

## What we're building

A control plane where a platform engineer **draws a technology stack** (a service, PostgreSQL, Kafka, an S3 bucket), **connects the pieces with Gloves** (typed connections whose compatibility is computed, not guessed), and **deploys it into a cluster they own**. Thanos then shows whether each technology *and each connection* is actually working.

## Recommended architecture (one paragraph)

- **Control plane:** a **modular-monolith** control plane (Go + PostgreSQL + React/React Flow) stores projects as versioned declarative YAML, validates them, resolves every Glove against declared package capabilities, and builds a deployment plan.
- **Agent:** an **outbound-only agent** in each user cluster executes the plan with namespaced RBAC, using Server-Side Apply for operator CRs and workloads and a small HTTP **Deployer Protocol** for external services. It then observes health and drift.
- **What never leaves the user's environment:** secret values, data and logs.
- **What is not in the MVP:** Argo Workflows, Argo CD and processing engines (NiFi/Flink). Each has a documented "reconsider when" condition.

## The decisions that matter most

| Decision                                                                                                                                                                               | Why                                                                                                                                                                                                                                   |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Gloves = output port → input port.** Ports have direction (in/out) × initiation (pull/push). Realization is R0 config-only, R1 provision, or R2 adapter. | Resolves the overlap in the original four modes. Explains exactly when a bridge is needed: pull-out → push-in needs a "pump". Separates the logical connection from the runtime data path. ([05](05-glove-interoperability-model.md)) |
| **Capabilities are declared, matched on a controlled protocol vocabulary, with ≤ 1 adapter hop, deterministic, and locked**                                                            | Avoids per-pair integrations: work grows with protocols, not technology pairs. Stable deploys. Explanations for every "no". ([05 §6](05-glove-interoperability-model.md#6-compatibility-resolution-algorithm))                        |
| **Deployers: declarative packages + built-in Kubernetes driver + HTTP Deployer Protocol**                                                                                              | Operators and containers need zero code. Third-party code never runs in the control plane. ([06](06-deployer-plugin-contract.md))                                                                                                     |
| **Native step coordinator instead of Argo Workflows** *(needs founder sign-off)*                                                                                                       | Argo Workflows is single-cluster and run-to-completion. The requirement is many firewalled user clusters plus continuous observation. ([ADR-007](10-architecture-decision-records.md#adr-007-deployment-orchestration))               |
| **Outbound-only agent, namespaced RBAC, no cluster-admin**                                                                                                                             | Works behind firewalls and proxies, with no central kubeconfigs. ([09](09-security-and-trust-boundaries.md))                                                                                                                          |
| **Thanos stores no secret values**                                                                                                                                                     | Strong trust story. Users or operators own Secrets. ([ADR-011](10-architecture-decision-records.md#adr-011-secret-management))                                                                                                        |
| **PostgreSQL only**                                                                                                                                                                    | One store covers all access patterns at this scale. ([04](04-domain-model-and-data-storage.md))                                                                                                                                       |

## MVP

- **Packages:** 4 technologies + 1 adapter + 1 "existing endpoint" package:
  - a container service;
  - PostgreSQL via CloudNativePG;
  - Kafka via Strimzi;
  - an S3 bucket via an external-API deployer;
  - a Kafka→S3 sink adapter.
- **Proof:** they exercise all 3 deployment models and all 3 connection realizations on OpenShift.
- **Demo:** the [order pipeline](examples/order-pipeline.project.yaml). Its resolution is checked by [`check_examples.py`](examples/check_examples.py).

## Hardest risks and how we test them first

1. **Market pull:** 12 discovery interviews and ≥ 3 design partners (gate G0).
2. **Security acceptance of an agent:** PoC-1 + early security reviews.
3. **Drift noise and SSA with operator webhooks:** PoC-2.
4. **Adapter reliability and licensing:** PoC-3.
5. **Coordinator robustness vs. Argo:** PoC-4.
6. **Concept comprehension:** PoC-6.

All run in weeks 1–4 ([11](11-testing-and-validation-strategy.md#1-proof-of-concept-experiments)).

## Team and schedule

- **A** owns backend, domain and the resolver. **B** owns the canvas and DX. **C** owns the agent, deployers, adapters and CI.
- **Base case: ~24 weeks to pilot-ready** (optimistic ~18, conservative ~32–36), assuming ~1.4× net AI leverage on bounded tasks. Gates are at weeks 4, 13 and 21 ([13](13-roadmap-for-three-person-team.md)).

## Founder decisions needed

1. Accept ADR-007 (no Argo Workflows in MVP).
2. Hosted vs. self-hosted pilots.
3. Confirm the initial segment (data platform teams on OpenShift).
4. **Pick a public name.** "Thanos" collides with a CNCF project that OpenShift itself ships, and with a Marvel character ([14](14-competitive-and-naming-assessment.md)).
5. Open-source strategy.
6. Business model hypotheses to test.

## First five actions

1. Founders: start discovery interviews and design-partner outreach (week 1).
2. C: PoC-1 (agent + namespaced RBAC on real OpenShift via proxy).
3. A: PoC-4 (coordinator + kill tests) and the repo skeleton with CI boundary lint.
4. B: PoC-5 (React Flow projection + schema forms), then the PoC-6 user test.
5. All: freeze `schemas/*.json` and agree the step/channel contract by week 7. Port `check_examples.py` fixtures to Go tests.
