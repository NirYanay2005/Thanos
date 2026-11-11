# References

Research date: **2026-10-09**. All sources were consulted during this planning pass, either by fetching the page or (marked ⚠) only as a search-result snippet or summary. Treat ⚠ items as unverified until re-read at the source. Version numbers quoted in the docs were current on the research date.

## Orchestration (Argo) — ADR-007

| Source | Used for |
|---|---|
| https://argo-workflows.readthedocs.io/en/latest/retries/ | `retryStrategy`, retry policies, `argo retry` behavior |
| https://argo-workflows.readthedocs.io/en/latest/synchronization/ | Mutex/semaphore. Shared locks across controllers need a database. |
| https://argo-workflows.readthedocs.io/en/latest/workflow-archive/ | Archive requires Postgres/MySQL |
| https://argo-workflows.readthedocs.io/en/latest/workflow-templates/ | Templates (no versioning guidance found) |
| https://argo-workflows.readthedocs.io/en/latest/workflow-executors/ | Emissary executor |
| https://argo-workflows.readthedocs.io/en/latest/walk-through/kubernetes-resources/ | Resource template, success/failure conditions |
| https://argo-workflows.readthedocs.io/en/latest/walk-through/secrets/ | Secrets via standard Pod mechanisms |
| https://argo-workflows.readthedocs.io/en/latest/walk-through/timeouts/ | `activeDeadlineSeconds` |
| https://argo-workflows.readthedocs.io/en/latest/cli/argo_retry/ | Retry of failed workflows |
| https://argo-workflows.readthedocs.io/en/latest/security/ | Controller and workflow pod RBAC |
| https://argo-workflows.readthedocs.io/en/latest/workflow-controller-configmap/ | Controller configuration |
| https://github.com/argoproj/argo-workflows/releases | Current version (v4.1.x) |
| https://github.com/argoproj/argo-workflows/issues/3523 ⚠ | Multi-cluster: no official support (also community projects below) |
| https://github.com/mikeshng/argo-workflow-multicluster | Community/OCM multi-cluster approach |
| https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/ | Cluster credentials stored as Secrets in the hub |
| https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/ | ApplicationSet generators |
| https://argo-cd.readthedocs.io/en/stable/operator-manual/cluster-bootstrapping/ | Bootstrapping patterns |
| https://argo-cd.readthedocs.io/en/stable/operator-manual/health/ | Custom health checks (Lua) |
| https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/ | selfHeal/prune defaults |
| https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/ | Sync waves and hooks |
| https://github.com/argoproj/argo-cd/releases | Current version (v3.5.x) |
| https://github.com/argoproj-labs/argocd-agent and /releases | Pull-based agent, pre-GA (v0.10.0, 2026-08) |
| https://docs.redhat.com/en/documentation/red_hat_openshift_gitops/ | OpenShift GitOps (Red Hat Argo CD distribution) |

## OpenShift, OLM, Kubernetes

| Source | Used for |
|---|---|
| https://docs.redhat.com/en/documentation/openshift_container_platform/4.20/html/extensions/extensions-overview | OLM v1 GA, ClusterExtension/ClusterCatalog |
| https://docs.redhat.com/en/documentation/openshift_container_platform/4.20/html/extensions/cluster-extensions | Per-extension ServiceAccount, no cluster-admin requirement |
| https://docs.redhat.com/en/documentation/openshift_container_platform/4.20/observability/extensions/index ⚠ | OLM v1 limitations (AllNamespaces only, no webhooks) |
| https://docs.redhat.com/en/documentation/openshift_container_platform/4.18/html-single/release_notes ⚠ | OLM v1 GA in 4.18 |
| https://docs.redhat.com/en/documentation/openshift_container_platform/4.20/html/operators/administrator-tasks | Operator installation by admins |
| https://docs.redhat.com/en/documentation/openshift_container_platform/4.20/html/operators/understanding-operators | OLM concepts |
| https://olm.operatorframework.io/docs/concepts/crds/subscription/ | Subscription, manual InstallPlan approval |
| https://olm.operatorframework.io/docs/concepts/crds/operatorgroup/ | OperatorGroup install modes |
| https://docs.redhat.com/en/documentation/openshift_container_platform/4.20/html/authentication_and_authorization/managing-pod-security-policies | `restricted-v2` SCC |
| https://docs.redhat.com/en/documentation/openshift_container_platform/4.20/html/builds_using_buildconfig/index | BuildConfig still documented |
| https://docs.redhat.com/ko/documentation/openshift_container_platform/4.20/html/builds_using_shipwright/index | Builds (Shipwright) |
| https://docs.redhat.com/en/documentation/builds_for_red_hat_openshift/1.7/html/release_notes/release-notes ⚠ | Builds for Red Hat OpenShift 1.7 |
| https://www.redhat.com/en/blog/red-hat-openshift-and-sigstore | cosign/Sigstore integration |
| https://kubernetes.io/docs/reference/using-api/api-concepts/ | Discovery API |
| https://kubernetes.io/docs/reference/using-api/server-side-apply/ | SSA, field managers, conflicts |
| https://kubernetes.io/docs/concepts/architecture/garbage-collection/ | ownerReferences (no cross-namespace) |
| https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/ | Finalizers |
| https://github.com/kubernetes/community/blob/master/contributors/devel/sig-architecture/api-conventions.md | Conditions, observedGeneration |
| https://github.com/kubernetes-sigs/cli-utils/blob/master/pkg/kstatus/README.md | kstatus readiness computation |
| https://open-cluster-management.io/docs/concepts/architecture/ | Pull-based hub/klusterlet pattern |
| https://ranchermanager.docs.rancher.com/reference-guides/rancher-manager-architecture/communicating-with-downstream-user-clusters | Downstream cluster agent pattern |
| https://ranchermanager.docs.rancher.com/reference-guides/rancher-manager-architecture/rancher-server-and-components | Rancher architecture |

## Protocols, messaging, connectors, schemas

| Source | Used for |
|---|---|
| https://www.rfc-editor.org/rfc/rfc9113 | HTTP/2 (framing/multiplexing for HTTP semantics) |
| https://github.com/cloudevents/spec | CloudEvents v1.0.2, protocol bindings |
| https://kafka.apache.org/42/design/design/ | Delivery semantics, idempotent producer, transactions |
| https://kafka.apache.org/blog/2025/03/18/apache-kafka-4.0.0-release-announcement/ | Kafka 4.0 KRaft-only |
| https://kafka.apache.org/blog | Current Kafka releases |
| https://kafka.apache.org/42/kafka-connect/user-guide/ | Connect workers, converters, SMTs, `errors.tolerance`, DLQ (sink only) |
| https://strimzi.io/ · https://strimzi.io/docs/operators/latest/deploying.html · …/configuring.html | Strimzi (CNCF Incubating), KRaft. KafkaConnect CRD details ⚠ not fully verified. |
| https://docs.confluent.io/kafka-connect-s3-sink/current/overview.html | Confluent S3 sink: Confluent Community License |
| https://github.com/Aiven-Open/cloud-storage-connectors-for-apache-kafka | Apache-2.0 S3/GCS/Azure sink connectors |
| https://aiven.io/blog/aiven-statement-on-kafka-license | Aiven licensing context |
| https://github.com/lensesio/stream-reactor | Apache-2.0 S3 connector (Kafka version support to verify) |
| https://camel.apache.org/camel-kafka-connector/latest/reference/connectors/camel-aws-s3-sink-kafka-sink-connector.html | Camel S3 sink connector |
| https://json-schema.org/specification | JSON Schema 2020-12 |
| https://spec.openapis.org/oas/latest.html | OpenAPI (3.2.x latest, JSON Schema 2020-12 dialect) |
| https://www.asyncapi.com/docs/reference/specification/v3.0.0 | AsyncAPI 3.0 |
| https://www.apicur.io/registry/ | Apicurio Registry (Apache-2.0) |
| https://github.com/confluentinc/schema-registry | Confluent Schema Registry licensing |
| https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html | Compatibility modes |
| https://cloudnative-pg.io/ · https://www.cncf.io/projects/cloudnativepg/ | CloudNativePG (CNCF Sandbox), Ready condition |
| https://access.crunchydata.com/documentation/postgres-operator/latest/ | Crunchy PGO alternative |
| https://debezium.io/documentation/reference/stable/connectors/postgresql.html | CDC via logical decoding (future pull dialect) |

## Processing engines

| Source | Used for |
|---|---|
| https://nifi.apache.org/download/ · https://nifi.apache.org/ | NiFi 2.x status |
| https://github.com/konpyutaika/nifikop | Community NiFi operator |
| https://flink.apache.org/downloads/ | Flink 2.x |
| https://nightlies.apache.org/flink/flink-kubernetes-operator-docs-main/ | Official Flink Kubernetes Operator |
| https://github.com/Redpanda-Data/connect · https://docs.redpanda.com/connect/get-started/licensing/ | Redpanda Connect licensing |
| https://github.com/apache/camel-k · https://camel.apache.org/camel-k/next/index.html | Camel K status |

## Competitive landscape

https://www.massdriver.cloud/ · https://radapp.io/ · https://www.cncf.io/projects/radius/ · https://humanitec.com/ · https://score.dev/ · https://kratix.io/ · https://www.crossplane.io/ · https://www.cncf.io/projects/crossplane/ · https://kubevela.io/ · https://www.cncf.io/projects/kubevela/ · https://www.cncf.io/projects/backstage/ · https://www.redhat.com/en/technologies/cloud-computing/developer-hub · https://www.port.io/ · https://www.brainboard.co/ · https://www.cloudcraft.co/ · https://github.com/acorn-io/runtime · https://encore.dev/ · https://www.pulumi.com/ · https://developer.hashicorp.com/terraform · https://www.ibm.com/products/streamsets · https://airbyte.com/ · https://www.confluent.io/ · https://nodered.org/ · https://n8n.io/ · https://www.redpanda.com/connect · https://docs.redhat.com/en/documentation/openshift_container_platform/4.19/html/building_applications/odc-viewing-application-composition-using-topology-view · https://www.kubeflow.org/docs/components/pipelines/ · https://github.com/elyra-ai/elyra · https://glasskube.dev/ · https://github.com/projectsveltos/sveltos

## Naming and market

| Source | Used for |
|---|---|
| https://www.cncf.io/projects/thanos/ · https://thanos.io/ | CNCF Thanos project (Incubating) |
| https://docs.redhat.com/en/documentation/openshift_container_platform/4.14/html-single/monitoring/index ⚠ | Thanos Querier in OpenShift monitoring |
| https://trademark.justia.com/owners/marvel-characters-inc-2453901/page11 ⚠ | Marvel trademark portfolio (specific mark not verified) |
| https://www.fool.com/earnings/call-transcripts/2026/01/28/ibm-ibm-q4-2025-earnings-call-transcript/ | OpenShift ~$1.9 B ARR, > 30% growth |
| https://www.sec.gov/Archives/edgar/data/0000051143/000005114326000078/ibm-20260630.htm ⚠ | OpenShift ARR Q2 2026 (not read directly) |
| https://www.blocksandfiles.com/ai-ml/2025/12/12/data-integration-market-set-for-slower-growth-says-gartner/1720515 | Gartner data integration market (via trade press) |
| https://www.gartner.com/en/infrastructure-and-it-operations-leaders/topics/platform-engineering ⚠ (403) | Platform engineering prediction. **Not used** in the pitch. |

## Standards referenced from general knowledge (not re-fetched in this pass)

RFC 9110 (HTTP semantics), RFC 9457 (problem details), RFC 7386 (JSON Merge Patch), RFC 8785 (JSON Canonicalization Scheme), CEL specification (github.com/google/cel-spec), and Kubernetes CEL usage in validation and admission. Verify specifics before relying on them in implementation.
