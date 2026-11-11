# Thanos — pitch deck source

> Source of truth for `thanos-pitch.pptx`. Regenerate with `cd pitch && npm install && node build_deck.js`.
> Audience: technical design partners, collaborators, early-stage investors.
> Rules followed:
> - No traction, revenue, interviews, partnerships or superiority claims are invented.
> - All market figures are sourced.
> - Hypotheses are labeled.
> - "Thanos" is a codename ([naming assessment](../docs/thanos/14-competitive-and-naming-assessment.md)).

---

## 1. Title
**Thanos (codename): compose, connect and deploy technology stacks, visually, into infrastructure you own.**

Visual: three nodes (Service → Postgres, Service → Kafka → S3) joined by Glove connectors.

*Notes:*
- Thanos is a control plane. You draw a stack, connect the parts with typed connections we call Gloves, and deploy it into your own OpenShift cluster.
- It then tells you whether each part *and each connection* actually works.
- "Thanos" is a working name. We will rename before launch.

## 2. Problem: wiring heterogeneous technology is manual, repeated and fragile
1. Read each operator's docs and write custom resources.
2. Hunt for service names, ports and generated secret names; wire them into apps by hand.
3. Pick, license-check and configure connectors (e.g. Kafka → S3).
4. Repeat per team and per environment.
5. When it breaks, figure out *which link* failed.

Callout: *The glue between components is where time goes, and nobody owns it.* (Hypothesis, being validated in discovery interviews.)

*Notes:*
- This is our hypothesis of the pain for platform and data teams on OpenShift.
- We have not yet completed interviews. Validating this is our first milestone.

## 3. Current alternatives leave a gap
| Approach | Good at | Gap for this job |
|---|---|---|
| Helm/YAML + GitOps (Argo CD) | Reliable delivery of known manifests | You still hand-write the wiring between technologies |
| Developer portals (Backstage, Red Hat Developer Hub) | Templates, catalog, self-service | Scaffolding, not validated connections or runtime status |
| Platform orchestrators (Humanitec, Massdriver) | Resource graphs, cloud IaC | Mostly cloud-IaC centric; not data stacks on your OpenShift |
| Data/flow tools (NiFi, Airbyte, Kafka Connect) | Moving data | They run pipelines; they don't deploy and wire the systems |

*Notes:*
- Massdriver is the closest, with a visual canvas over IaC modules.
- None of the tools we surveyed combines validated cross-technology connections with deployment into the customer's own OpenShift. That's a statement about our search, not proof.

## 4. Solution: design → connect → validate → deploy → observe
- **Design:** drag technologies from a curated catalog; forms are generated from each package's schema.
- **Connect:** Gloves compute compatibility from declared capabilities.
- **Validate:** structural, semantic and cluster preflight checks; plain-language explanations when something can't connect.
- **Deploy:** a reviewed plan, executed by an agent inside your cluster.
- **Observe:** per-technology and per-connection health, plus drift.

*Notes:* everything is stored as versioned, declarative YAML, so you can diff, export and review it like code.

## 5. Product experience
Canvas: `orders-db` → `orders-api` → `events (Kafka)` → `archive (S3)`.
- db → api: auto-resolved `pgwire/3`, config-only.
- api → events: user picks Kafka; Thanos provisions the topic.
- events → archive: "Both ends are passive. Thanos adds a Kafka→S3 sink adapter."
- Status per connection: **configured → deployed → ready → flowing** (or "not observable").

*Notes:*
- This is the reference MVP pipeline.
- The key moment is the third connection. Instead of failing at runtime, Thanos explains why a direct link is impossible and inserts the right adapter.

## 6. Architecture: your cluster, your secrets
- **Thanos control plane:** UI, API, catalog, resolver, planner, deployment records.
- **Your cluster:** an outbound-only agent (namespaced RBAC, no cluster-admin) applies operator resources and workloads, calls deployers for external APIs, and watches health and drift.
- **Never leaves your environment:** secret values, data, payloads, logs (streamed on request only).

*Notes:*
- No inbound firewall rules and no central kubeconfigs.
- The operators you already trust (CloudNativePG, Strimzi) do the heavy lifting. We orchestrate and observe.

## 7. Differentiation: Gloves and pluggable deployers
- **Ports:** in/out × pull/push. A Glove joins an output to an input.
- **Realization:** config-only, provisioned resource, or adapter. The runtime path is explicit.
- **Scale:** matching is on protocols, not technology names. Adding one technology connects it to everything that speaks its protocols, and adding one adapter bridges whole protocol families.
- **Deployers:** declarative packages for operators and containers; a small HTTP protocol for external services. New technologies need no core changes.

*Notes:*
- Most integration tools grow by pairwise connectors. Our work grows with the number of protocols.
- Honest limit: the MVP checks that the pipes fit, not that the record schemas match. Schema compatibility comes later.

## 8. Initial market and use case
- **Who:** platform and data-platform teams in enterprises already running Red Hat OpenShift, who repeatedly provision "service + Postgres + Kafka + object storage" stacks for internal teams.
- **Why them:** infrastructure ownership and security constraints are strongest here, and our design turns them into a feature.
- **Signal (sourced):** IBM reported OpenShift as a ~$1.9 B ARR business growing > 30% (Q4 2025 earnings call). That is the platform's size, not our market.
- **Our market size:** not yet reliably measurable. We will build a bottom-up estimate from design-partner data.

*Notes:* we deliberately do not show a TAM number, because we couldn't find one we would defend.

## 9. Business model: hypotheses to test
- Subscription per managed environment (cluster namespace), tiered by catalog and policy features.
- Self-hosted enterprise license for regulated customers.
- Certified technology packages and partner catalogs (later).

All three are labeled **Hypothesis**: to be tested with design partners. No pricing has been validated.

## 10. Roadmap
| When (base case) | Milestone |
|---|---|
| Weeks 1–4 | Discovery interviews + 6 proof-of-concept experiments → go/no-go |
| ~Week 10 | Design loop: canvas → validate → versioned YAML |
| ~Week 13 | First real deployment into an OpenShift cluster via the agent |
| ~Week 21 | MVP complete: 4 technologies, Kafka→S3 adapter, status & recovery |
| ~Week 24 | Pilot-ready with design partners |
| Later | GitOps export, managed operator install, more packages, stream processing (e.g. Flink) |

*Notes:* three engineers using AI coding agents. The range is ~18 to ~36 weeks, depending on PoC outcomes.

## 11. Risks and defensibility
| Hard problems / risks | Why we can win |
|---|---|
| Teams may be "fine" with Helm + GitOps | Capability model + explanations are hard to replicate as an add-on |
| Security approval of an in-cluster agent | Trust-by-design: outbound-only, namespaced, no secret values |
| Operator heterogeneity (readiness, drift) | Package catalog and adapters compound over time |
| Platform owner could extend its console | Integrate with Developer Hub; focus on cross-technology semantics |
| Name/trademark conflict | Rename before launch |

## 12. The ask: become a design partner
- **We're looking for 3 design partners**: OpenShift platform or data teams with a recurring stack-provisioning need.
- **You get:** early access, input into the catalog, a pilot in your own cluster.
- **We ask for:** a 45-minute discovery interview, a security review of the agent design, and a sandbox namespace for a pilot.
- **For investors and collaborators:** help us reach these teams.

*Notes:* close with the concrete next step, a discovery interview within two weeks.
