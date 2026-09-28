# GitHub Enterprise SSO/OIDC integration plan

## Purpose and decision

This plan adds a plug-and-play enterprise connection for a **private company GitHub repository** without asking users to paste a GitHub PAT, storing a provider token in browser storage, or treating a GitHub login as Studio authorization.

The recommended design deliberately uses two independent trust relationships:

1. **Company OIDC → Spec-Kit Studio:** authenticates the human through the company identity provider (for example, Microsoft Entra ID). It creates a Studio session and establishes the person’s Studio role.
2. **GitHub App → selected organization repositories:** authorizes Studio to read or perform explicitly enabled GitHub actions. GitHub App installation tokens are short-lived, repository-scoped, minted server-side, and never sent to the browser.

This separation is essential. Company SSO answers “who is using Studio?” A GitHub App answers “which repositories and operations may Studio perform?” Neither is allowed to silently imply the other.

For GitHub Enterprise Cloud organizations with SAML SSO, the organization administrator must approve/install the GitHub App and any required SSO authorization in GitHub. For GitHub Enterprise Server, the same architecture applies, but the enterprise base/API URLs and app registration are environment-specific. The provider adapter must make that difference configuration, not application branching.

Relevant provider references to verify during implementation:

- [GitHub App installation authentication](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-as-an-installation)
- [GitHub App user-to-server authentication](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-with-a-github-app-on-behalf-of-a-user)
- [Authorizing OAuth apps for SAML SSO](https://docs.github.com/en/enterprise-cloud@latest/authentication/authenticating-with-saml-single-sign-on/authorizing-an-oauth-app-for-use-with-saml-single-sign-on)
- [OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0.html)

## Current state and migration boundary

Today, `server/routes/integrationRoutes.ts` accepts a GitHub token from the request body or `GITHUB_TOKEN`, then uses it for repository listing, issue reads, and `.spec-kit` commits. The client keeps integration secrets only in the active browser session, which is better than persistent browser storage, but still is not the right model for a company private repository under SSO.

The enterprise implementation must introduce a new `github-app` connection path. It must not reinterpret a browser-provided token as an SSO credential or silently fall back to `GITHUB_TOKEN`.

During migration:

- Keep the present token path only behind an explicit **local/manual integration** configuration, disabled by default in enterprise mode.
- Do not show a PAT field in the enterprise connection experience.
- Disable remote write actions until an organization admin has installed the GitHub App, a Studio administrator has granted the repository, and the acting user has an allowed Studio role.
- Mark existing PAT connections as “legacy manual connection”; offer disconnect/migration guidance, never auto-migrate a token.

## Product experience

### First-time user flow

1. A user opens Studio and sees one primary button: **Continue with Company SSO**.
2. Studio redirects to the configured OIDC provider using Authorization Code flow with PKCE, `state`, and `nonce`.
3. On return, Studio creates an HttpOnly session and lands the user on **Connected Workspace**.
4. The workspace shows one connection card with an unambiguous state:
   - **GitHub not connected** — “Ask a GitHub organization admin to install Studio.”
   - **Installed, no repository granted** — “Choose a repository your Studio administrator has enabled.”
   - **Repository ready** — show organization, repository, default branch, app identity, granted capability summary, and last verified time.
   - **Needs attention** — show a focused recovery action, never a raw provider error.
5. Selecting a repository starts read-only. The first consequential action presents a review screen naming the repository, branch, files/issue operation, and the company identity that will be recorded in the audit trail.

### Administrator flow

1. In **Settings → Enterprise integrations**, an administrator chooses **Connect GitHub organization**.
2. Studio displays the exact GitHub App installation URL and the minimal requested permissions. The admin completes the GitHub installation in GitHub’s own UI.
3. GitHub sends the installation webhook. Studio verifies its signature, records only the installation metadata, and shows **Installation verified**.
4. The administrator selects the allowed repositories and Studio roles allowed to use each capability. The default is read-only.
5. Studio performs a read-only canary (`metadata` and selected repository read), records the result, and only then marks the connection ready.

### Design rules for intuitive, resilient UX

- One authoritative connection status, not separate SSO, token, and GitHub status widgets.
- Every error says whether the problem is identity, Studio authorization, GitHub installation, repository grant, SAML/organization policy, network/rate limit, or a requested action conflict.
- Provide **Retry safely**, **Refresh access**, **Open GitHub admin instructions**, and **Switch repository** only where each is valid.
- Preserve the last verified repository metadata as visibly stale during an outage; do not erase a working connection based on one failed refresh.
- Never display access tokens, private keys, full JWTs, webhook signatures, or raw upstream response bodies.
- Keep the existing local loopback connector separate: company GitHub authorization does not grant local filesystem or agent authority.

## Security and authorization model

### Identity and Studio session

Use OIDC Authorization Code with PKCE, performed by the server as a confidential client.

- Validate discovery metadata only from a configured issuer over HTTPS.
- Validate issuer, audience/client ID, signature/JWKS key, `exp`, `nbf`, `nonce`, `state`, PKCE verifier, and authorization-code one-time use.
- Identify a principal by immutable `issuer + subject`, not email. Email and display name are profile attributes only.
- Require an explicit allowed tenant/issuer configuration. Do not accept a tenant merely because an email domain matches.
- Store the browser session in a `Secure`, `HttpOnly`, `SameSite=Lax`, path-scoped cookie. Rotate session IDs at sign-in and privilege changes. Keep CSRF protection for state-changing requests.
- Store OIDC refresh tokens only when required, encrypted at rest with envelope encryption; never serialize them to the client, logs, telemetry, receipts, or error messages.
- Default to deny. An authenticated but unprovisioned person receives no repository list and a clear “access has not been granted” state.

### GitHub App authorization

Use a GitHub App rather than a shared PAT or an organization-wide user OAuth token.

- Keep App ID, client ID, private key, webhook secret, and GitHub base URLs in a managed secrets store; inject them server-side only.
- Sign the App JWT only in memory, mint an installation access token on demand, cache it only in process memory until well before expiry, and key the cache by enterprise host + installation ID + permission set.
- Restrict installation to selected repositories wherever GitHub supports it. Require explicit Studio-side repository grants even if GitHub installation scope is broader.
- Begin with minimal permissions: `Metadata: read`; add `Contents: read`, `Issues: read/write`, `Pull requests: read/write`, or `Contents: write` only behind separately enabled capabilities and review.
- Do not request organization administration, Actions secrets, workflow administration, members, or broad write permissions for the initial release.
- Treat GitHub webhooks as authenticated external events, not authorization decisions. Verify signature, timestamp/replay window, delivery ID deduplication, and configured enterprise host before updating state.
- For actions that must be attributed to a person, record the Studio OIDC principal and GitHub App installation identity together. Do not require a GitHub user OAuth token unless a concrete GitHub API capability requires user context.

### Two policy checks before every GitHub request

Every operation must pass both checks; UI visibility is never sufficient.

1. **Studio policy:** session principal has a role that permits the requested capability for the selected tenant, installation, and repository.
2. **GitHub capability:** the GitHub App installation token has the required repository permission and the installation remains active.

If either cannot be proven, return a typed denial. Never downgrade to the legacy PAT route, a server-wide token, or a broader repository scope.

## Modular architecture

Use ports/adapters so the domain never imports GitHub SDK or OIDC-provider specifics directly.

```text
Browser experience
  └─ auth feature + github connection feature (no provider secrets)
        └─ Studio API / BFF
             ├─ Identity port       → OIDC adapter
             ├─ Session port        → encrypted session store
             ├─ Authorization port  → tenant/repository policy evaluator
             ├─ GitHub port         → GitHub App adapter
             ├─ Audit port          → append-only audit/outbox store
             └─ Webhook port        → verified GitHub delivery handler
```

Suggested modules:

| Module | Responsibility | Must not do |
| --- | --- | --- |
| `server/auth/oidcConfig.ts` | Validate static OIDC and cookie configuration at startup. | Fetch user repositories or assign roles. |
| `server/auth/oidcClient.ts` | Discovery, authorization redirect, code exchange, ID-token validation. | Expose provider tokens to HTTP responses. |
| `server/auth/sessionService.ts` | Create, rotate, revoke, and load sessions. | Decide repository permissions. |
| `server/auth/principal.ts` | Normalized immutable principal and profile types. | Use email as the primary key. |
| `server/github/githubAppClient.ts` | App JWTs, installation token minting, typed GitHub API calls. | Make Studio authorization decisions. |
| `server/github/githubEnterpriseConfig.ts` | GitHub.com/GHES endpoint configuration and validation. | Contain secrets in diagnostics. |
| `server/github/webhookVerifier.ts` | Signature, replay, and delivery dedupe checks. | Invoke business side effects directly. |
| `server/authorization/repositoryPolicy.ts` | Evaluate principal + repo + capability + policy version. | Call GitHub without a decision record. |
| `server/audit/integrationAudit.ts` | Append actor, request intent, provider IDs, result, and correlation ID. | Retain tokens, source contents, or prompts by default. |
| `server/routes/authRoutes.ts` | Redirect/callback/session/logout endpoints. | Embed policy logic. |
| `server/routes/githubConnectionRoutes.ts` | Connection status, repository selection, capability requests. | Accept PATs in enterprise mode. |
| `src/features/auth/*` | Sign-in/session/status UI. | Persist credentials. |
| `src/features/githubConnection/*` | Setup wizard, repository picker, recovery UI. | Infer authorization from UI state. |

Define interfaces before adapters, for example `IdentityProvider`, `SessionStore`, `RepositoryAuthorizer`, `GitHubInstallationClient`, `AuditWriter`, and `WebhookDeliveryStore`. Test each against fakes; test real provider wiring only in integration suites.

## Durable data model

Introduce a production database before enabling enterprise writes. Browser IndexedDB remains local Studio convenience state, not the authority for identity, grants, or audit.

Minimum records:

| Record | Key fields | Security/property |
| --- | --- | --- |
| `principal` | `id`, `issuer`, `subject`, profile revision | Unique `(issuer, subject)`; no email authorization. |
| `session` | opaque ID hash, principal ID, expiry, rotation family | Revocable; encrypted/hashed server-side. |
| `organization_connection` | tenant, GitHub host, app installation ID, status | No installation token persisted. |
| `repository_grant` | connection, repository node/ID, allowed capabilities, policy revision | Explicit allow-list and deny-by-default. |
| `role_binding` | principal/group source, Studio role, scope, expiry | Evaluated server-side. |
| `webhook_delivery` | GitHub delivery ID, event type, received/processed state | Idempotent unique delivery ID. |
| `integration_audit_event` | actor, request ID, capability, target, outcome, provider IDs | Append-only; redacted structured metadata. |
| `outbox_event` | event type, idempotency key, attempts, result | Durable retries and reconciliation. |

Use UUID/internal IDs plus immutable GitHub repository IDs; repository names are display data and may change. Add optimistic concurrency/version fields for grants and connection status.

## API contract

All endpoints use the existing stable error envelope and request IDs. Return opaque identifiers and capability summaries, never provider credentials.

| Endpoint | Purpose | Required policy |
| --- | --- | --- |
| `GET /api/auth/session` | Minimal session/profile/role summary. | Session optional; no secrets. |
| `GET /api/auth/login` | Starts OIDC authorization. | Public, rate limited. |
| `GET /api/auth/callback` | Validates code, state, nonce, creates session. | One-time callback state. |
| `POST /api/auth/logout` | Revokes current session and clears cookie. | Current session + CSRF. |
| `GET /api/github/connections` | Lists visible connection states. | Authenticated Studio user. |
| `POST /api/github/connections/install-link` | Creates admin installation handoff. | Studio integration admin. |
| `POST /api/github/webhooks` | Receives verified GitHub App deliveries. | Signature/replay/delivery validation. |
| `GET /api/github/repositories` | Lists only Studio-granted repositories. | `repository.read` policy. |
| `GET /api/github/repositories/:id/issues` | Reads issues via installation token. | `issues.read` policy + app permission. |
| `POST /api/github/actions/*` | Creates a reviewed remote action request. | Explicit capability, CSRF, idempotency key. |

Remote writes should initially be modeled as a reviewed `GitHubActionRequest`: validate intent → compute preview/digest → show user confirmation → execute once with idempotency key → poll/reconcile provider result → append audit event. Do not expose a generic “GitHub request” proxy.

## Configuration contract

Separate provider configuration by environment and fail closed in enterprise mode.

```dotenv
# Studio workforce OIDC (server-only except a deliberately public client ID if required)
STUDIO_AUTH_MODE=enterprise
STUDIO_OIDC_ISSUER=https://login.microsoftonline.com/<tenant-id>/v2.0
STUDIO_OIDC_CLIENT_ID=<server-web-client-id>
STUDIO_OIDC_CLIENT_SECRET=<secret-reference-or-injected-value>
STUDIO_OIDC_REDIRECT_URI=https://studio.company.example/api/auth/callback
STUDIO_OIDC_ALLOWED_ISSUERS=https://login.microsoftonline.com/<tenant-id>/v2.0
STUDIO_SESSION_COOKIE_NAME=speckit_session
STUDIO_SESSION_ENCRYPTION_KEY=<32-byte-secret-reference>

# GitHub App (server-only)
STUDIO_GITHUB_MODE=github-app
STUDIO_GITHUB_HOST=https://github.company.example
STUDIO_GITHUB_API_URL=https://github.company.example/api/v3
STUDIO_GITHUB_APP_ID=<app-id>
STUDIO_GITHUB_APP_CLIENT_ID=<client-id>
STUDIO_GITHUB_APP_PRIVATE_KEY=<secret-reference-or-injected-value>
STUDIO_GITHUB_WEBHOOK_SECRET=<secret-reference-or-injected-value>
```

Production startup must reject insecure redirect URIs, missing issuer/client/session key, missing GitHub App configuration when `github-app` mode is enabled, wildcard origins, plaintext key values in checked-in config, and accidental coexistence of enterprise mode with a PAT fallback.

## Error, retry, and recovery contract

| Condition | User-facing state | System behavior |
| --- | --- | --- |
| OIDC login cancelled/expired | “Sign-in did not complete.” | Clear transient state; no partial session. |
| OIDC claim/issuer invalid | “Your company account cannot be verified.” | Deny; redact validation details; security audit event. |
| Authenticated but unprovisioned | “Access has not been granted.” | No repo metadata leak; admin request guidance. |
| GitHub App not installed | “An organization admin must connect GitHub.” | Show installation handoff only to admins. |
| App lacks repository permission | “GitHub access needs an admin update.” | Do not retry writes; record capability mismatch. |
| SAML/organization restriction | “GitHub organization policy needs approval.” | Preserve connection state; provide organization-safe recovery text. |
| Rate limit/temporary outage | “GitHub is temporarily unavailable; last verified access is shown.” | Exponential backoff with jitter; stale state; no duplicate writes. |
| Webhook duplicate/out of order | No user interruption. | Deduplicate delivery ID; version/reconcile connection state. |
| Write timeout/unknown result | “We are confirming whether GitHub completed the request.” | Reconcile by idempotency/provider request evidence; never blind retry. |

Classify every retry as read-only, idempotent provider side effect, or non-idempotent. Only automatically retry the first two after a bounded backoff.

## Implementation phases

### Phase 0 — decisions and threat model

1. Confirm GitHub Enterprise Cloud versus GitHub Enterprise Server, enterprise host/API URL, company IdP, supported browsers, data classification, retention, and required compliance controls.
2. Obtain App owner approval and define the initial repository/capability allow-list.
3. Record threats: token/key disclosure, callback mix-up, CSRF, session fixation, tenant confusion, webhook replay, repository substitution, confused deputy, rate limits, provider outage, and audit tampering.
4. Approve the role model and the initial read-only pilot scope.

**Exit:** architecture/security owners approve the trust boundaries and no PAT-based enterprise fallback remains in scope.

### Phase 1 — identity foundation

1. Add OIDC config validation, authorization-code + PKCE adapter, JWKS validation/cache, opaque server session store, CSRF defenses, logout/revocation, and principal provisioning.
2. Add `auth` feature UI with loading, denied, expired, and retry states.
3. Gate every existing integration route behind a single server authorization middleware, initially denying enterprise access until policy is present.
4. Add audit events for sign-in, sign-out, denial, and session revocation.

**Exit:** cross-user, cross-tenant, expired-session, CSRF, callback-replay, invalid-issuer, and missing-role tests pass.

### Phase 2 — GitHub App read-only connection

1. Add GitHub App configuration, private-key provider, installation-token service, typed GitHub client, webhook verifier, and installation/repository records.
2. Implement admin installation handoff and verified webhook reconciliation.
3. Build the connection wizard and repository picker using only Studio-granted repositories.
4. Replace enterprise reads of `/api/github/repos` and `/api/github/issues` with GitHub App routes; retain legacy routes only in local/manual mode.

**Exit:** no GitHub token reaches browser network payloads, browser storage, telemetry, or logs; read-only canary works against one non-production private repository.

### Phase 3 — policy and audited writes

1. Add tenant/repository/capability role bindings, policy versioning, action previews, idempotency keys, outbox, reconciliation, and immutable audit events.
2. Enable one narrow write capability at a time, beginning with a controlled issue/comment or a feature-scoped artifact branch—not direct default-branch writes.
3. Add a human confirmation screen bound to repository ID, branch, artifact digest, and intended effect.

**Exit:** privilege bypass, repository substitution, duplicate submit, provider timeout, webhook replay, and audit-integrity tests pass; security review approves the specific capability.

### Phase 4 — operations and rollout

1. Add privacy-safe metrics: sign-in success, connection readiness, policy denial category, token mint latency, GitHub rate-limit headroom, webhook lag, reconciliation age, and action completion rate. Do not emit source content, prompts, paths, tokens, or raw provider bodies.
2. Create dashboards, alerts, runbooks, key rotation, App installation removal/revocation, incident procedures, backup/restore tests, and support ownership.
3. Run a non-production pilot with one organization/repository and read-only permission. Expand capabilities only after evidence review.

## Test matrix and release gates

Automated coverage must include unit, contract, integration, and browser/E2E tests.

- OIDC: state/nonce/PKCE checks, issuer/audience/signature/expiry validation, JWKS rotation, session rotation, logout, CSRF, callback replay, unprovisioned identity.
- Authorization: user A cannot view user B’s connection; role change invalidates cached capability; repository rename cannot change grant; denied beats unknown.
- GitHub App: JWT/token mint failure redaction, installation token cache expiry, host isolation, exact permission mapping, SAML/403 classification, rate-limit handling.
- Webhooks: valid signature, invalid signature, stale replay, duplicate delivery, out-of-order installation event, repository removal.
- Writes: preview digest mismatch, idempotent retry, timeout reconciliation, conflicting branch SHA, no default-branch write without explicit capability.
- Security: secrets absent from all JSON responses, logs, telemetry, browser storage, error bodies, and retained receipts; CSP/CSRF/cookie flags validated in production smoke tests.
- Accessibility: keyboard-only sign-in recovery, focus after OIDC return, status live region, clear non-color error text, WCAG 2.2 AA contrast.

Release requires a clean Node 22 `npm ci`, `npm run verify:production`, integration tests against a disposable non-production GitHub organization/repository, IdP test tenant validation, threat-model review, and sign-off by identity, GitHub organization, security, and operational owners.

## Inspiration retained from `ad-studio` and `cloud-asset-inventory`

The design adopts the strongest applicable ideas from `ad-studio` without coupling products:

- **Server truth over client state:** browser UI is a view of the authenticated server decision, never the authority.
- **Deny beats unknown:** a missing claim, membership, repository grant, installation permission, or evidence record blocks the action.
- **No hidden fallback:** an SSO/GitHub App failure cannot fall back to a PAT or broad server credential.
- **Every external integration is an adapter:** GitHub, the IdP, session store, policy evaluator, and audit store are replaceable ports.
- **Idempotency and reconciliation:** provider acceptance is not completion; writes have durable intent, deduplication, and observed-result reconciliation.
- **Explicit user state:** the UI distinguishes denied, pending, stale, retriable, and completed states instead of presenting a generic “connected” label.

`cloud-asset-inventory` supplies a second, practical enterprise-login reference. Its frontend establishes configuration before initializing the identity client, uses the Microsoft authentication library’s silent-token path before interactive recovery, maintains an explicit initializing state across redirect handling, and does not treat authentication as authorization: it determines a role from managed group claims (with a Graph membership lookup when claims are overage) before enabling the application.

Those lessons are included deliberately, with two improvements required for Studio’s use case:

- **Configuration-first bootstrap:** load and validate public identity metadata before presenting a login action. Fail visibly if configuration is incomplete; never construct an identity client from partial configuration.
- **One shared identity boundary:** expose `AuthSession` and `AuthorizationPort` to all Studio features rather than letting features independently acquire, decode, or attach tokens.
- **Silent recovery, bounded interactivity:** attempt refresh/recovery once, surface an intelligible signed-out or expired state, and make an explicit user action start a new redirect. Prevent redirect loops with a transaction/attempt record.
- **Authentication is not authorization:** accept an OIDC identity only after the server maps verified claims to a Studio principal and evaluates a server-side role/repository/capability binding. Group claims are hints to the authorization adapter, not a browser-side access decision.
- **No browser bearer-token design:** `cloud-asset-inventory` is a useful MSAL/Entra UI reference, but Studio should improve its security boundary by using the backend-for-frontend session model described above. It must not put a Studio access token, GitHub App token, or GitHub credential in `sessionStorage`, `localStorage`, application state, or API request payloads.
- **Token lifecycle as a component:** borrow the idea of silent renewal and expiry detection, but implement it behind `OidcClientPort`, `SessionService`, and the server’s encrypted key/session stores. The UI receives only a minimal session summary and a stable recovery code.
- **Role/load sequencing:** the UI must remain in an accessible “Checking access” state until identity verification and server authorization are complete. It must never briefly render private repository names or enable actions before policy resolves.

This gives the integration the familiar Entra/SSO experience demonstrated by `cloud-asset-inventory`, while preserving the more secure server-truth, GitHub-App-based model required for private company repositories.

## Decisions required before coding

1. GitHub Enterprise Cloud or GitHub Enterprise Server, plus the exact enterprise host/API URL.
2. Company IdP/tenant and whether Studio roles come from a managed group claim, SCIM-provisioned bindings, or an internal authorization service.
3. Initial GitHub App permissions and the one repository permitted for the read-only pilot.
4. Production database, managed secrets store/KMS, deployment environment, session retention, audit retention, and key-rotation owner.
5. Whether any user-context GitHub capability is actually required. If not, do not add GitHub OAuth/user-to-server tokens.
6. Required security/privacy/compliance reviews and the named on-call/incident owner.

Until these decisions and the Phase 1–4 gates are complete, describe the work as a planned enterprise integration—not as SSO-enabled production access.
