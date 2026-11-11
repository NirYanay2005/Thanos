# Thanos (codename): planning repository

Architecture, product definition, roadmap and pitch for **Thanos**, a platform for visually composing, connecting (with **Gloves**) and deploying technology stacks into user-owned OpenShift/Kubernetes clusters.

> **Status: planning phase.** No product code exists yet, by design. "Thanos" is a working name only. See the naming assessment before using it publicly.

## Start here

1. [Executive summary](docs/thanos/00-executive-summary.md): what, why, key decisions, first actions.
2. [Gloves model](docs/thanos/05-glove-interoperability-model.md): the core idea, formalized.
3. [System architecture](docs/thanos/03-system-architecture.md): control plane, agent, deployment lifecycle.
4. [Roadmap](docs/thanos/13-roadmap-for-three-person-team.md): phases, gates, backlog, AI workflow.

## Document map

| # | Document | Kind |
|---|---|---|
| 00 | [Executive summary](docs/thanos/00-executive-summary.md) | Summary |
| 01 | [Product requirements](docs/thanos/01-product-requirements.md) | Requirements (hypotheses) |
| 02 | [MVP scope & acceptance criteria](docs/thanos/02-mvp-scope-and-acceptance-criteria.md) | Requirements |
| 03 | [System architecture](docs/thanos/03-system-architecture.md) | Design |
| 04 | [Domain model & data storage](docs/thanos/04-domain-model-and-data-storage.md) | Design |
| 05 | [Glove interoperability model](docs/thanos/05-glove-interoperability-model.md) | Design |
| 06 | [Deployer plugin contract](docs/thanos/06-deployer-plugin-contract.md) | Contract |
| 07 | [Project YAML specification](docs/thanos/07-project-yaml-specification.md) | Contract |
| 08 | [API & integration contracts](docs/thanos/08-api-and-integration-contracts.md) | Contract |
| 09 | [Security & trust boundaries](docs/thanos/09-security-and-trust-boundaries.md) | Design |
| 10 | [Architecture decision records](docs/thanos/10-architecture-decision-records.md) | Decisions |
| 11 | [Testing & validation strategy (incl. PoCs)](docs/thanos/11-testing-and-validation-strategy.md) | Plan |
| 12 | [Risk register & open questions](docs/thanos/12-risk-register-and-open-questions.md) | Plan |
| 13 | [Roadmap for three-person team](docs/thanos/13-roadmap-for-three-person-team.md) | Plan |
| 14 | [Competitive & naming assessment](docs/thanos/14-competitive-and-naming-assessment.md) | Research |
| — | [References](docs/thanos/references.md) | Sources consulted |

**Machine-checked artifacts**

| Path | What |
|---|---|
| [`docs/thanos/schemas/project.v1alpha1.schema.json`](docs/thanos/schemas/project.v1alpha1.schema.json) | Project YAML schema (JSON Schema 2020-12) |
| [`docs/thanos/schemas/package.v1alpha1.schema.json`](docs/thanos/schemas/package.v1alpha1.schema.json) | Technology/adapter package and capability schema |
| [`docs/thanos/examples/packages/`](docs/thanos/examples/packages/) | 4 illustrative technologies + 2 adapters |
| [`docs/thanos/examples/order-pipeline.project.yaml`](docs/thanos/examples/order-pipeline.project.yaml) | End-to-end example project |
| [`docs/thanos/examples/check_examples.py`](docs/thanos/examples/check_examples.py) | Executable reference of validation and Glove resolution rules |

```bash
pip install pyyaml jsonschema
python docs/thanos/examples/check_examples.py   # validates everything, prints resolution, asserts 6 rejections
```

**Pitch**

| Path | What |
|---|---|
| [`pitch/thanos-pitch.md`](pitch/thanos-pitch.md) | Slide-by-slide source with speaker notes |
| [`pitch/thanos-pitch.pptx`](pitch/thanos-pitch.pptx) | Editable PowerPoint (generated) |
| [`pitch/build_deck.js`](pitch/build_deck.js) | Regenerates the .pptx (`cd pitch && npm install && node build_deck.js`) |

## Recommended implementation sequence

1. **Weeks 1–4:** discovery interviews ∥ PoCs 1–6 → gates G0 (market) and G1 (architecture).
2. Repo foundations, then the pure core (project model → catalog → resolver → planner) ∥ canvas on a mock API.
3. Agent + Kubernetes driver + coordinator → first real OpenShift deploy (G2, ~week 13).
4. Glove runtime (topic provisioning, Kafka→S3 adapter, S3 HTTP deployer) → observability, security, recovery → E2E (G3, ~week 21).
5. Pilot readiness (~week 24).

## Open decisions (founder input)

1. Argo Workflows replaced by a native coordinator for the MVP? ([ADR-007](docs/thanos/10-architecture-decision-records.md#adr-007-deployment-orchestration))
2. Hosted vs. self-hosted pilots.
3. Initial segment confirmation.
4. Public product name (trademark clearance).
5. Open-source strategy.
6. Business-model hypotheses to test.

Details: [12 §2](docs/thanos/12-risk-register-and-open-questions.md#2-open-questions-requiring-founder-input).
