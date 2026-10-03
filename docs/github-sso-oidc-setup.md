# GitHub Enterprise SSO/OIDC setup

This guide enables the implemented enterprise mode. It is intentionally separate from the personal/public GitHub mode.

## Choose the correct connection

| Repository type | Studio mode | Credential boundary |
| --- | --- | --- |
| Company private repository | `STUDIO_AUTH_MODE=enterprise` | Company OIDC for the person; GitHub App installation token held only on the server. |
| Personal or open-source public repository | default (`disabled`) | A user enters a fine-grained PAT for the active browser session. Studio verifies that every selected target repository is public. |

Never enable a PAT as a fallback for the company GitHub App connection.

## 1. Create the company OIDC application

Register either a confidential web application or an Entra public client in the company identity provider (use the tenant-specific v2 issuer). Add the matching redirect URI exactly:

```
https://<studio-host>/api/auth/callback
```

Request `openid profile email`, expose group membership or use an identity-provider access group, and record:

- issuer URL;
- client ID and secret;
- the Studio access group object ID(s).

For a local proof of concept only, `http://localhost:<port>/api/auth/callback` is accepted outside production. Production requires HTTPS.

### Reusing the Cloud Asset Inventory Entra registration locally

Cloud Asset Inventory uses an Entra public-client registration. Studio supports
that registration without a connector or browser-held token: use its client ID
and authority, set `STUDIO_OIDC_CLIENT_AUTH_METHOD=none`, and set the registered
SPA origin (for example `http://localhost:3000`) as `STUDIO_OIDC_REDIRECT_URI`.
Studio uses PKCE to redeem the code and then issues its own HttpOnly session.
For a deployed Studio use a Studio-specific Entra application and HTTPS origin.

## 2. Create and install a GitHub App

Create an organization-owned GitHub App, generate its private key, and install it only on the pilot repositories. Start with the smallest permissions required:

- **Metadata: read-only** — repository picker and identity verification.
- **Contents: read/write** only when committing a reviewed `.spec-kit` package is approved.
- **Issues: read-only** only when importing issues is required.

Do not grant organization administration, member administration, workflows, secrets, pull requests, or broad repository access unless a reviewed feature explicitly needs them. Save the App ID, installation ID, and PEM key in the deployment secret manager.

## 3. Configure the deployment

Set the following secrets/variables in the hosting platform—not in a client bundle or source-controlled `.env` file:

```dotenv
STUDIO_AUTH_MODE=enterprise
STUDIO_SESSION_SECRET=<at-least-32-random-characters>
STUDIO_OIDC_ISSUER=https://login.microsoftonline.com/<tenant-id>/v2.0
STUDIO_OIDC_CLIENT_ID=<confidential-client-id>
STUDIO_OIDC_CLIENT_SECRET=<secret-manager-reference>
STUDIO_OIDC_REDIRECT_URI=https://<studio-host>/api/auth/callback
STUDIO_OIDC_SCOPES=openid,profile,email
STUDIO_OIDC_REQUIRED_GROUP_IDS=<studio-access-group-object-id>
STUDIO_GITHUB_APP_ID=<app-id>
STUDIO_GITHUB_APP_INSTALLATION_ID=<installation-id>
STUDIO_GITHUB_APP_PRIVATE_KEY=<PEM-from-secret-manager>
# Set only for GitHub Enterprise Server:
# STUDIO_GITHUB_API_URL=https://github.<company>/api/v3
```

For a public-client Entra registration, replace the client-secret line with:

```dotenv
STUDIO_OIDC_CLIENT_AUTH_METHOD=none
STUDIO_OIDC_REDIRECT_URI=http://localhost:3000
```

The server rejects incomplete enterprise OIDC settings at startup. The GitHub App settings are optional when Studio is used without company GitHub access; however, once any one App setting is supplied, all three are required. In enterprise mode the browser never sends a GitHub token and the existing `GITHUB_TOKEN` environment value is ignored for company repository actions.

## 4. Validate before rollout

1. Sign in with a member and non-member account: only the member may reach Studio.
2. Confirm `/api/auth/session` returns an opaque session summary and never returns an IdP token.
3. In **Start delivery work → GitHub source**, confirm **Company GitHub App** is enabled only after SSO and configuration are both present; load one installed-repository Issue URL and one Milestone URL. No PAT input should appear. Product Manager intake selects this connector-free path automatically.
4. Attempt a private repository with the public-PAT mode: it must be rejected.
5. Start read-only, then enable a single scoped write after review.
6. Rotate the OIDC client secret and GitHub App key in the secret manager; deploy and validate again.

## Operational note

The current `SessionStore` is a replaceable server port with an in-memory development implementation. Before deploying more than one process or serverless instance, provide a shared, TTL-capable `SessionStore` implementation (for example Redis or the company session platform) and inject it into `AuthRuntime`. This is required for cross-instance sessions, immediate revocation, and resilient failover; it is deliberately not hidden behind a weak fallback.
