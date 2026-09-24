# Production deployment and user-owned coding agents

This document is the production architecture target for Spec-Kit Studio. It separates the repository's current, verified behavior from the systems that must exist before a hosted, multi-user deployment can be called production-ready.

## Executive decision

Use a **hosted Studio control plane** plus a **locally installed Studio Companion**. The companion runs only on the user's workstation, launches the coding CLI already authorized for that user, and connects outward to the control plane. Studio must not collect or proxy a user's Codex, Claude Code, GitHub Copilot, SSH, or Git credentials.

This is the default billing model:

| Work | Identity and cost owner | Where it runs |
| --- | --- | --- |
| Spec/plan/task drafting in a browser-only flow | The configured Studio provider account or organization | Hosted Studio service |
| Codex, Claude Code, or Copilot CLI work | The user account currently authenticated in that CLI | User's workstation, through the Companion |
| Organization-approved automation | The organization account and its explicitly configured provider credentials | Isolated organization worker or CI |

The UI must always display which of these modes applies before an action starts. “Your local provider account” and “organization-paid automation” must never look interchangeable.

## What exists today

The repository includes an optional Node-based local connector (`connector/server.mjs`). It is intentionally a local-only tool, not a hosted agent gateway.

- It listens only on `127.0.0.1`.
- It confines repositories and worktrees to configured allowed roots.
- It limits browser origins and can require an `x-studio-token` pairing value.
- It uses explicit confirmation for writes, worktree creation, checks, prerequisite installation, and local-agent execution.
- It invokes installed Codex, Claude Code, or GitHub Copilot CLIs on the same machine. The relevant CLI's existing login determines provider authorization and billing.
- It does not commit, push, open pull requests, deploy, persist jobs, provide enterprise SSO, or supply a remote command channel.

As of 2026-09-24, `STUDIO_CONNECTOR_MODE=production` fails closed unless all of the following are explicit: a narrow absolute `STUDIO_ALLOWED_ROOTS` boundary, HTTPS `STUDIO_ALLOWED_ORIGINS`, and a pairing token of at least 32 bytes. Development mode intentionally retains localhost defaults for local use.

The connector's pairing token is a local boundary control, not an identity system, provider credential, or replacement for a user-facing confirmation.

## Target architecture

```text
Browser ── TLS/OIDC ──> Studio control plane ── outbound TLS/WebSocket ──> Studio Companion
   │                           │                                      │
   │                           ├── tenant, RBAC, audit, policy         ├── OS keychain
   │                           ├── signed one-time action grants      ├── allowed worktree
   │                           └── optional org worker / CI           └── user's installed CLI
   │                                                                          │
   └── never receives provider API keys or local repository access ──────────┘
                                                                              │
                                                   Codex / Claude / Copilot provider account
```

### Control plane

The hosted service should own:

- OIDC or SAML sign-in, MFA requirements, SCIM lifecycle integration where required, and session management.
- A tenant model: organization, workspace, project, repository registration, feature/story, and worktree records.
- Least-privilege roles. A practical minimum is organization administrator, workspace administrator, delivery author, delivery approver, implementer, auditor, and read-only viewer.
- Policy decisions: which repositories, branches, tools, models, actions, and organization-paid providers are allowed.
- Append-only audit records for every material event: authentication, pairing, grant creation, command request, local approval, execution result, file summary, verification result, and revocation.
- A durable job store and job/result retention policy. Browser state must not be the system of record for a production audit trail.
- A short-lived, signed action-grant issuer. The service does not send shell commands. It grants a precise, policy-approved capability to a companion.

### Studio Companion

The Companion replaces the assumption that a web page can directly reach `localhost` on every user device. It should be an installable, signed desktop/background service that:

- Establishes an outbound mutually authenticated connection to the control plane. No inbound firewall port should be required.
- Creates a device keypair during enrollment and stores private material in the operating-system keychain or credential store.
- Displays the enrolled user, device, organization, Companion version, and local CLI readiness.
- Lets the user choose the local repository and grants only a narrowly scoped path/worktree boundary.
- Verifies the control-plane action grant locally, shows an actionable approval dialog, then launches only approved local tools.
- Captures bounded, redacted output and structured evidence; it must not upload whole repositories by default.
- Supports update verification, device revocation, forced upgrade, and an offline/no-control-plane failure mode that denies new execution grants.

The current loopback connector is useful for development and early adopters. It is not yet this Companion and must not be represented as one.

## Per-action authorization

Every action that can read a repository, write files, create a worktree, execute a tool, or invoke a coding agent needs a signed, single-use grant. The grant should contain at least:

- Issuer, audience, key identifier, algorithm, issuance time, expiry, and unique nonce.
- Tenant, user, device, workspace, repository registration, and worktree identifiers.
- Exact operation (`scan`, `preview`, `apply`, `create-worktree`, `run-check`, or `run-agent`).
- An allowlisted agent and model policy, never arbitrary executable and argument fields.
- Approved repository-root identifier, branch/worktree identifier, task/story/feature identifier, and an immutable prompt or work-package digest.
- A required human-confirmation flag, a policy version, and a correlation ID shared with the audit log.

The Companion must validate signature, issuer, audience, expiration, nonce replay, device binding, and every scope field before asking for local confirmation. It must record an approval or rejection before execution. A grant should expire in minutes, be consumed exactly once, and be revocable by device, user, workspace, repository, or organization policy.

Do not use a browser-stored shared token as the production grant. Do not use a long-lived bearer token that can authorize arbitrary future repository actions.

## Provider identity and billing

### User-owned local account (default)

The user installs and signs into Codex, Claude Code, or Copilot CLI using their own permitted account. The Companion discovers readiness without reading the provider credential. Studio sends a task-scoped work package to the Companion; the selected local CLI sends its own authenticated request to the provider. Provider usage is therefore associated with the user's CLI session and the provider's own billing/entitlement rules.

This approach keeps provider credentials out of Studio and avoids requiring the company to resell or hold personal provider access. Studio should display a clear preflight statement such as: “Runs locally with your signed-in Codex account. Provider usage is governed and billed by your OpenAI account or organization.” Equivalent wording must be used for Claude Code and Copilot.

The billing statement is informational, not accounting proof. Exact charges, quota, model availability, and organization policy are provider-specific and can change; the user must see those in the provider's account or organization administration tools.

### Organization-paid automation (separate opt-in mode)

For centralized usage, execute through an organization-owned worker or CI identity. Store provider credentials only in an organization secret manager, use workload identity where supported, apply provider/model allowlists and spend limits, and label the UI “Organization-paid automation.” The worker must run in a short-lived isolated environment with a repository checkout limited to the approved commit/worktree and no ambient developer credentials.

This mode needs its own authorization, cost-center allocation, retention, incident response, and egress policy. It must not silently fall back from a failed user-owned local run.

### Browser-only generation

The existing Gemini path is server-side and uses the deployed service's `GEMINI_API_KEY`; it is not a user-owned CLI-billing flow. A production deployment must either disclose it as organization-paid, implement a provider-supported user authorization model, or disable it for tenants that prohibit shared provider billing.

## Repository and data boundaries

1. Register a repository by identity and immutable remote URL/canonical identifier, not only by a user-supplied path.
2. Require the user to select a local checkout or create an approved linked worktree after the repository is registered.
3. Default to metadata, manifests, diffs, bounded command output, and requested artifact files. Whole-source upload requires a separate policy and an explicit data-classification decision.
4. Redact common credential patterns in output and prevent token, secret, and `.env` paths from routine upload. Treat redaction as defense in depth, not a guarantee.
5. Encrypt control-plane data in transit and at rest. Define regional residency, tenant isolation, retention, deletion, backup, and legal-hold behavior before accepting customer repositories.
6. Keep audit evidence separate from editable delivery artifacts. Evidence needs immutable timestamps, actor/device IDs, correlation IDs, and access controls.

## Production security requirements

Before general availability, complete the following:

- Threat model the browser, control plane, Companion, local workstation, provider CLI, repository, secrets, and supply chain.
- Perform independent application and desktop/Companion security review, penetration testing, dependency/license review, and remediation tracking.
- Use a managed secrets system, key rotation, signed releases, SBOMs, vulnerability response targets, and provenance for both cloud and Companion builds.
- Enforce HTTPS, HSTS, CSP, secure cookies, CSRF protection where relevant, rate limits, abuse controls, and structured audit logs in the hosted service.
- Define SLOs, alerts, on-call ownership, incident response, disaster recovery, restore testing, and customer support escalation.
- Establish privacy notices, data-processing terms, subprocessors, accessibility validation, and jurisdiction-specific legal review appropriate to the intended market.

No code change in this repository can truthfully certify all of these activities as complete.

## Rollout plan

### Phase 0 — local hardening (in progress in this repository)

- Fail closed for explicit production connector roots, origins, and pairing token.
- Document the actual connector boundary and production target.
- Add automated configuration tests.
- Preserve development-mode local defaults for contributors.

### Phase 1 — Companion foundation

- Build and sign the Companion for supported operating systems.
- Implement device enrollment, keychain storage, outbound connection, update verification, and remote revocation.
- Replace browser-to-loopback assumptions in hosted deployments.

### Phase 2 — control plane and policy

- Add tenant-aware identity, RBAC, policy administration, durable audit/job storage, and short-lived action grants.
- Add a clear provider/billing-mode screen and repository registration flow.
- Integrate grant validation and user confirmation into the Companion.

### Phase 3 — enterprise operation

- Add organization worker/CI mode, secrets management, cost attribution, and isolated execution.
- Complete security, privacy, accessibility, reliability, and operational readiness reviews.
- Run a limited, monitored pilot before general availability.

## Production connector configuration today

The currently shipped loopback connector can be run in strict production configuration only as a bridge while the Companion is built:

```bash
STUDIO_CONNECTOR_MODE=production \
STUDIO_ALLOWED_ROOTS=/Users/alex/work/company-repositories \
STUDIO_ALLOWED_ORIGINS=https://studio.example.com \
STUDIO_CONNECTOR_TOKEN='generate-and-store-a-random-32-plus-byte-value' \
npm run connector
```

This requires a local user to enter the connector URL and pairing token into Studio. It is appropriate only when the device, network, and hosted origin are deliberately administered. It does not add SSO, device identity, durable audit logs, signed execution grants, or central provider billing.

## Decisions required from the deployment owner

Implementation of Phases 1–3 needs decisions that cannot responsibly be invented in source code:

1. Target cloud, regions, data residency, and regulated-data classification.
2. Identity provider and required protocols (OIDC, SAML, SCIM), MFA rules, and tenant model.
3. Default billing policy: user-owned local CLI, organization-paid worker, or both.
4. Supported operating systems and desktop-device management requirements.
5. Repository hosts, Git credential boundaries, branch protections, and required CI gates.
6. Data retention/deletion, audit retention, incident response owner, and service-level objectives.
7. Legal/compliance scope and release-approval authority.

Until these decisions, external integrations, and independent reviews are complete, this project should be described as a hardened local workflow product with a documented production architecture target—not as a fully production-ready multi-tenant service.
