# FedRAMP High readiness

This guide describes what it would take to operate Spec-Kit Studio as part of
a FedRAMP High authorization boundary. It is a readiness guide, not a claim
that Studio, a container image, an AWS or Azure account, or a deployment mode
is FedRAMP authorized.

FedRAMP authorization applies to a deployed cloud service offering and its
operating model: the application, infrastructure, identities, data flows,
personnel, documented controls, assessment evidence, and ongoing monitoring.
The authorizing official determines whether a system receives an Authority to
Operate (ATO). A cloud provider's authorization can supply inherited controls,
but it does not authorize a customer workload by itself.

## Current Studio posture

Studio has controls that are useful foundations for a regulated deployment:

- Enterprise OIDC configuration can fail closed when required settings are
  absent, and supports group-based access decisions.
- `STUDIO_DEPLOYMENT_MODE=govcloud` and `dod` require enterprise access and
  disable external AI egress. The UI shows this operating boundary without
  claiming an authorization.
- The production service has security headers, non-cacheable API responses,
  bounded request handling, structured request IDs, and client-safe error
  responses.
- The included container is multi-stage, runs as an unprivileged user, has a
  public health endpoint, excludes local environment files, and is covered by
  build-time contract checks.
- The local connector is separate from the hosted service and can use narrow
  allowed roots, an explicit pairing token, origin restrictions, and disabled
  external coding-agent egress in regulated mode.

These properties reduce risk; they are not a substitute for a system security
plan, a security assessment, continuous monitoring, or an ATO.

## Gaps that must be addressed before an authorization assessment

### 1. Select and constrain the deployment boundary

Choose one deployment target and document every component in the boundary.
For example, use only services confirmed as in scope for the intended AWS
GovCloud (US) or Azure Government authorization. Record the exact regions,
service SKUs, endpoints, tenant/account ownership, responsibility model, and
inherited controls. Revalidate the service scope when the architecture or the
provider's authorization changes.

Do not treat the generic Vercel configuration as a FedRAMP High deployment
path. Its current adapter deliberately permits only disabled Studio
authentication because it does not provide the durable shared session and OIDC
transaction storage required for enterprise operation.

### 2. Implement durable security state

The built-in session store is process-local and is appropriate only for a
single local process. Before a multi-instance or regulated deployment, replace
it with a reviewed durable, encrypted shared store and test:

- session expiry, revocation, rotation, and invalidation after a credential or
  authorization change;
- encryption at rest and in transit, key rotation, backup, restore, and
  deletion behavior;
- availability and recovery across instance restart, zone failure, and
  planned maintenance; and
- auditable access to session and authorization state without logging secrets.

The state store, artifact storage, logs, backups, identity provider, and all
supporting services belong in the approved boundary or must have a documented,
approved interface and data-flow decision.

### 3. Build a controlled platform through infrastructure as code

Create reviewed infrastructure-as-code for the chosen cloud. At minimum, the
design needs private application networking, TLS termination, an application
gateway or load balancer, WAF and DDoS controls, restricted egress, private
service-to-service paths, least-privilege workload identities, secrets from an
approved secret manager, customer-managed encryption where required, and
encrypted backup and recovery controls.

Infrastructure code should be reviewed, versioned, policy-checked, and
promoted through separated environments. Configuration drift must be detected
and acted on. Do not place environment secrets, access tokens, certificate
material, or cloud credentials in Git, container layers, browser code, task
receipts, or application logs.

### 4. Define identity and privileged-access operations

The hosted service should use enterprise OIDC with a precise public URL and
redirect URI, short session lifetime, group or role authorization, and a
durable transaction/session implementation. The broader environment also needs
an identity-operating model covering MFA, conditional access, least privilege,
privileged role management, account provisioning and deprovisioning, access
reviews, emergency access, and security-event monitoring.

Identity requirements are not solved by adding an OIDC client ID and secret.
They must be configured, evidenced, reviewed, and operated by the organization
that owns the boundary.

### 5. Make all data flows explicit

Inventory every inbound and outbound connection, the data it can carry, where
it terminates, who controls it, and the approval that permits it. This includes
the browser, Studio API, identity provider, GitHub, Jira, model providers,
local connector, coding agents, dependency registries, telemetry/logging,
artifact storage, email/notification services, and administrative endpoints.

For regulated data, GitHub, Jira, Gemini, Codex, Copilot, and any other public
SaaS must be disabled, kept outside the regulated flow, or replaced by an
approved service with an approved data-flow decision. The regulated Studio
mode already blocks external AI egress; do not work around that protection with
browser keys or a local proxy. The local connector must remain a separately
managed developer-machine component and must never be exposed as a hosted
network service.

### 6. Establish an approved software supply chain

Use an approved internal package and container registry, retain dependency and
image provenance, generate and retain an SBOM, scan source and images, define
severity-based remediation timelines, and retain release-approval evidence.
Pin and review the production base image by immutable digest in the approved
deployment pipeline. A versioned Docker tag is useful but is not sufficient
evidence of immutable provenance.

The repository's `npm run verify:production` gate verifies repository build,
tests, browser checks, dependency audit, and a production smoke test. It does
not prove the security of a cloud account, container registry, CI runner,
identity provider, or deployed infrastructure. Add platform-native policy,
image, secret, and infrastructure scans to the release process.

### 7. Operate audit, incident, and recovery controls

Route structured application, authentication, administrative, platform, and
security events to the approved protected audit system. Define event fields,
retention, access controls, time synchronization, alert ownership, triage,
and evidence review. Test incident response, backup restoration, key and
credential rotation, disaster recovery, and vulnerability remediation at the
cadence required by the system owner.

Avoid logging user content, access tokens, OIDC assertions, connector pairing
tokens, private keys, or full agent prompts and outputs unless the approved
data classification and retention design explicitly permits it.

### 8. Prepare authorization and continuous-monitoring evidence

The system owner and security team need a maintained body of evidence, usually
including:

- system security plan and control implementation statements;
- system boundary and data-flow diagrams;
- responsibility and inherited-control matrix;
- asset inventory, configuration baselines, SBOMs, and release records;
- vulnerability, patch, incident, contingency, and recovery procedures and
  evidence;
- risk register and Plan of Action and Milestones (POA&M) process;
- assessment evidence, remediation records, and continuous-monitoring reports;
- secure configuration guidance for administrators and operators; and
- the agency or sponsoring organization's authorization decision.

The exact package, assessment route, and evidence requirements must be agreed
with the sponsoring agency, authorizing official, and assessor. Studio cannot
determine its own impact level or ATO status.

## Recommended implementation sequence

1. Classify the data and select the sponsoring organization, target cloud, and
   authorization path.
2. Produce the boundary and data-flow inventory before enabling integrations.
3. Build the target environment with reviewed infrastructure as code and
   platform policy controls.
4. Replace the process-local session store and complete the enterprise identity
   design.
5. Decide which integrations and agent capabilities are permitted; default all
   others to disabled.
6. Add supply-chain controls, protected audit logging, monitoring, backup, and
   recovery evidence.
7. Map implemented and inherited controls to the authorization package,
   remediate gaps, and complete assessment with the responsible parties.
8. Operate continuous monitoring after authorization; reassess changes before
   they enter the boundary.

## References

- [FedRAMP](https://www.fedramp.gov/)
- [Microsoft: Configure Microsoft Entra ID for FedRAMP High impact](https://learn.microsoft.com/en-us/entra/standards/configure-for-fedramp-high-impact)
- [Microsoft: Azure Government secure configuration guide](https://learn.microsoft.com/en-us/azure/azure-government/compliance/recommended-secure-configuration)
- [AWS GovCloud (US): compliance](https://docs.aws.amazon.com/govcloud-us/latest/UserGuide/govcloud-compliance.html)
- [Studio regulated deployment mode](regulated-deployment.md)
- [Studio production deployment](production-deployment.md)

