# 14 — Competitive Landscape and Naming Assessment

> Research date: 2026-10-09. Every entry was read from the cited source in this research pass, except where marked *not verified*. Searches were bounded, so **the absence of a competitor in this list is not proof that none exists.** Sources: [references.md](references.md#competitive-landscape).

## 1. Landscape

| Tool | Category | What overlaps with Thanos | What differs | License / status (2026) |
|---|---|---|---|---|
| **Massdriver** | Visual platform orchestrator | **Closest:** a canvas where developers connect catalog "bundles" (Terraform/Helm modules), with live resource tracking | Targets cloud IaC (AWS/GCP/Azure) rather than data technologies on user-owned OpenShift. A capability-typed connection model comparable to Gloves was *not verified*. | Commercial, active |
| **Radius** (radapp.io) | Application platform | Application Graph of components and dependencies, recipes for infrastructure | Developer-authored Bicep app model. The graph is a view of dependencies, not a drag-and-connect deployment surface. A "Canvas Extension" is in preview. | OSS, CNCF Sandbox (2024-04-16) |
| **Humanitec** + **Score** | Platform orchestrator / workload spec | Resolves a resource graph per workload, pluggable drivers | Backend for platform teams, driven by Score/API. No end-user canvas. SaaS. | Commercial (Score OSS, CNCF Sandbox) |
| **Crossplane** | Control-plane framework | Typed composite APIs over many providers. A possible *deployer backend* for Thanos (our Kubernetes driver can apply Crossplane resources). | No UI, no cross-technology connection validation | OSS, CNCF Graduated (2025-10-28) |
| **KubeVela / OAM** | App delivery | Component/trait model, workflows, UI (VelaUX, *details not verified*) | App-centric. No capability-resolved data-technology connections. | OSS, CNCF Incubating |
| **Kratix** | Platform framework ("Promises") | Pluggable platform capabilities on Kubernetes | Framework for platform teams; no canvas or compatibility validation | OSS + enterprise (Syntasso) |
| **Backstage / Red Hat Developer Hub** | Developer portal | Self-service templates; same OpenShift audience (RHDH) | Portal and catalog, not a composition and deployment engine. **Likely integration point** (a Thanos plugin), not a competitor. | OSS (CNCF Incubating) / Red Hat commercial |
| **Port** | IDP SaaS | Catalog, self-service | Now positioned as an "agentic SDLC" platform; no canvas | Commercial |
| **Brainboard** | Visual cloud designer | Draw architecture, generate Terraform, drift detection | Cloud IaaS + Terraform output | Freemium commercial |
| **Cloudcraft** (Datadog) | Diagramming | Visual architecture | Visualizes; does not deploy | Commercial |
| **Encore** | Infra-from-code | Deploys into the user's own cloud account | Code-annotation driven; AWS/GCP | Commercial + OSS parts |
| **Pulumi / Terraform** | IaC | What many target users do today | Code, not canvas. Candidate deployer backends. | OSS/commercial (Terraform license changed to BSL in 2023, *not re-verified here*) |
| **Apache NiFi**, **IBM StreamSets**, **Node-RED**, **n8n** | Visual data/flow tools | Visual connect-the-boxes | They **run** the data flow in their own runtime. Thanos **deploys and wires** independent technologies. Complementary: NiFi can be a future Thanos technology. | NiFi/Node-RED OSS; StreamSets commercial (IBM); n8n fair-code |
| **Airbyte**, **Kafka Connect/Confluent**, **Redpanda Connect** | Connector ecosystems | Pre-built connectors (Airbyte 700+, Redpanda Connect 300+, Confluent 200+ listed) | Move data between systems; they don't deploy the systems. **Adapter sources** for Gloves. | Mixed OSS/commercial |
| **OpenShift console Topology view** | Built-in cluster UI | Visualizes and manages application composition in the same clusters | Cluster-local, resource-level. Drag-to-connect semantics *not verified*. No cross-technology capability validation or external-service deployers. **The default alternative for our target user.** | Included with OpenShift |
| **Kubeflow Pipelines / Elyra** | ML pipelines | Visual pipeline editors | ML-specific execution | OSS |
| **Acorn**, **Glasskube** | (Defunct) | — | Acorn runtime repo archived 2024-03-16. Glasskube deprecated. | **Dead.** Cautionary data point on Kubernetes developer-tool startups. |

## 2. The real competitive alternatives for the initial customer

For a platform/data engineering team on OpenShift wiring Postgres + Kafka + services today, the alternatives are not other startups:

1. **Manual YAML/Helm + operator docs + Argo CD (OpenShift GitOps).** The dominant alternative. Free, flexible, and already approved by security.
2. **Internal platform built on Backstage/RHDH templates + Crossplane/Kratix.** A platform team builds "golden paths" itself.
3. **Platform orchestrators** (Humanitec, Massdriver). Commercial, mostly cloud-oriented.
4. **Doing nothing**: tickets to the platform team.

## 3. Where Thanos is meaningfully different (hypothesis to validate)

1. **Typed, explainable connections between heterogeneous technologies.** Compatibility is computed from declared capabilities and bridged by reusable adapters, and the system explains *why* two things can't connect. We found no surveyed tool doing this across data infrastructure.
2. **Deploys into user-owned OpenShift through an outbound-only agent with namespaced RBAC**, reusing the operators the customer already trusts, instead of a SaaS-hosted runtime or central cluster credentials.
3. **One model for three deployment styles** (operator CRs, containers, external APIs) without per-technology core code.

**What is *not* a differentiator:**
- Visual canvases (Massdriver, Brainboard, NiFi have them).
- "Deploy to Kubernetes" (everyone).
- Connector counts (Airbyte and Kafka Connect will always have more).

## 4. Adoption risks

| Risk | Why it matters | Mitigation |
|---|---|---|
| "We already have GitOps" | Platform teams have invested in Argo CD and Helm. | Position as *design + validation + wiring* that can **export to GitOps** (post-MVP). Don't fight the deploy pipeline. |
| Trust: an agent in production clusters | Security reviews take months. | Namespaced RBAC, outbound-only, no secret values, open-source agent (consider), self-hosting option. |
| Catalog breadth | Value scales with the number of packages. | Narrow wedge (Postgres/Kafka/S3/services); make package authoring easy. |
| Abstraction ceiling | Experts hit limits and leave. | Escape hatches: raw config passthrough per package, YAML view, export. |
| Red Hat building it into OpenShift (Topology / RHDH) | Platform owner risk | Focus on cross-technology semantics and external services, and integrate with RHDH rather than compete. |

## 5. Naming assessment: "Thanos"

| Finding | Evidence | Severity |
|---|---|---|
| **Thanos** is a well-known CNCF project (Prometheus long-term storage/HA), Incubating since 2020, used by Adobe, eBay and others. | cncf.io/projects/thanos, thanos.io | **High**: same ecosystem, same audience |
| OpenShift's default monitoring stack deploys **Thanos Querier**, so every OpenShift admin already sees "Thanos" pods. | Red Hat monitoring docs (seen via search snippet; *re-verify*) | **High**: direct confusion in the exact target clusters ("is this the monitoring Thanos?") |
| **Thanos** is a Marvel character, and Disney owns Marvel. Marvel Characters, Inc. holds a large trademark portfolio. A specific THANOS registration in software classes was **not verified** (search blocked). | Search results only | **Likely high**: and the "Gloves" (Infinity Gauntlet) metaphor deepens the association |
| `thanos.io` belongs to the CNCF project. | thanos.io | Domain/brand collision |

**Recommendation (not legal advice):**
- Treat "Thanos" strictly as an internal codename.
- Before any public pilot, have counsel run a clearance search (USPTO, EUIPO, WIPO Global Brand Database, common-law/web).
- Choose a public name that is distinctive in the Kubernetes ecosystem.
- Avoid Marvel-adjacent metaphors in public materials. "Gloves" can remain an internal term, or become a neutral public term such as "Links" or "Couplings".
- The YAML `apiVersion` group and label prefix are placeholders for exactly this reason.

## 6. Market sizing: what can and cannot be said

| Claim | Source quality | Usable? |
|---|---|---|
| OpenShift is a ~$1.9 B ARR business growing > 30% (IBM Q4 2025 earnings call) | Primary (earnings call transcript) | **Yes**, as evidence that the OpenShift installed base is large and growing. It is **not** our addressable market. |
| OpenShift ARR ~$2.2 B (IBM Q2 2026) | Search summary of SEC filing, not read directly | Only after verification |
| Gartner: data integration tools market $5.9 B in 2024, 8.1% CAGR to 2029 | Gartner via trade press | Context only. We are not a data integration tool. |
| Gartner: "80% of large software engineering orgs will have platform teams by 2026" | Secondary blogs; Gartner page inaccessible | **No**, until read at the source; and it's a prediction |
| OpenShift customer counts | Data-broker estimates only | **No** |

**Honest position:** there is no reliable top-down size for "visual composition and deployment of data technology stacks on OpenShift". The pitch should present a **bottom-up hypothesis**: number of OpenShift-running organizations with platform/data teams × teams per org × price per environment. It should be explicitly labeled as unvalidated, to be replaced with design-partner data.
