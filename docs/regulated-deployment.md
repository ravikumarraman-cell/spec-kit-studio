# Regulated deployment mode: GovCloud and DoD

This mode prepares Studio for deployment into a regulated boundary. It does
not confer FedRAMP authorization, a DoD SRG Impact Level, CMMC status, or an
Authority to Operate. Those determinations belong to the authorizing official,
system owner, and the deployed cloud/service boundary.

## Enable the application posture

Use one of these deployment modes:

```text
NODE_ENV=production
STUDIO_DEPLOYMENT_MODE=govcloud # or dod
STUDIO_AUTH_MODE=enterprise
STUDIO_SESSION_TTL_MS=3600000
STUDIO_EXTERNAL_AI_EGRESS=disabled
STUDIO_OIDC_ISSUER=https://identity.example.gov/tenant
STUDIO_OIDC_CLIENT_ID=...
STUDIO_OIDC_CLIENT_SECRET=...
STUDIO_OIDC_REDIRECT_URI=https://studio.example.gov/api/auth/callback
STUDIO_OIDC_REQUIRED_GROUP_IDS=authorized-group-id
STUDIO_SESSION_SECRET=<at least 32 characters>
```

The process refuses to start if any regulated prerequisite is absent. The mode
requires enterprise OIDC, group-based authorization, a session lifetime of at
most one hour, same-origin HTTPS OIDC discovery endpoints, non-cacheable API
responses, restrictive browser permissions, and blocked external Gemini egress.
An approved model service must be added as an in-boundary server-side adapter;
do not bypass this control with a browser API key.

## Visible operating context in Studio

When the application starts in `govcloud` or `dod` mode, Studio displays a
persistent **GovCloud deployment boundary** or **DoD deployment boundary**
banner beneath the top navigation on every screen. It states that enterprise
access is required and external AI egress is disabled unless an approved
in-boundary adapter is configured. The display is derived from the server's
public deployment-context endpoint; it exposes no identity, infrastructure, or
authorization configuration.

The banner is an operating-context reminder, not an authorization claim. It
does not assert an ATO, FedRAMP authorization, CMMC status, or DoD SRG Impact
Level. Do not hide or relabel it with a project-specific compliance status.

If the optional local connector is used in the same regulated workflow, set
`STUDIO_DEPLOYMENT_MODE` to the same value, use its existing production
boundary variables, and set `STUDIO_CONNECTOR_EXTERNAL_AGENT_EGRESS=disabled`.
The connector will still perform bounded local artifact operations, but refuses
to send repository data to a cloud coding agent. Enable an in-boundary agent
only through a reviewed future adapter; do not relax this switch for Codex,
Copilot, or another public SaaS agent.

Restart both the application and connector after changing deployment-mode
variables. The connector health response reports its mode for consistent local
diagnostics; the application banner is authoritative for the hosted Studio.

## Deployment boundary checklist

- Select only AWS GovCloud services that are in scope for the workload’s target
  authorization and Impact Level; validate this again at deployment time.
- Keep the application, identity provider, logs, backups, artifact store, and
  AI/model endpoint inside the approved authorization boundary.
- Terminate TLS with approved cryptography, enforce modern TLS at the load
  balancer, and keep all service-to-service traffic private.
- Use a private subnet/load balancer, WAF, DDoS controls, egress allowlists,
  least-privilege IAM roles, customer-managed encryption keys, and secrets from
  an approved secrets manager. Never put credentials in browser storage,
  configuration commits, tickets, or logs.
- Replace the in-memory session store with a vetted durable, encrypted session
  store before multi-instance production deployment; test revocation, expiry,
  backup, and recovery.
- Send the structured request and security events to the organization’s
  protected audit platform, retain them according to policy, and test alerting.
- Maintain an SSP/control implementation statement, data-flow diagram, SBOM,
  vulnerability-management evidence, incident runbook, contingency plan, and
  continuous-monitoring evidence with the system owner.

## What remains a deployment responsibility

AWS GovCloud supports workloads subject to FedRAMP High and DoD SRG IL2/IL4/IL5
depending on the service and workload, but service inclusion and customer
control inheritance must be verified for the exact architecture. DoD use also
requires the appropriate authorization process and boundary controls; the app
cannot determine its own Impact Level.
