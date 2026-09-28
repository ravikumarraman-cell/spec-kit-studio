# GitHub Enterprise SSO/OIDC setup

This guide enables the implemented enterprise mode. It is intentionally separate from the personal/public GitHub mode.

## Choose the correct connection

| Repository type | Studio mode | Credential boundary |
| --- | --- | --- |
| Company private repository | `STUDIO_AUTH_MODE=enterprise` | Company OIDC for the person; GitHub App installation token held only on the server. |
| Personal or open-source public repository | default (`disabled`) | A user enters a fine-grained PAT for the active browser session. Studio verifies that every selected target repository is public. |

Never enable a PAT as a fallback for the company GitHub App connection.

## 1. Create the company OIDC application

Register a confidential web application in the company identity provider (for Microsoft Entra ID, use the tenant-specific v2 issuer). Add this redirect URI exactly:

```
https://<studio-host>/api/auth/callback
```

Request `openid profile email`, expose group membership or use an identity-provider access group, and record:

- issuer URL;
- client ID and secret;
- the Studio access group object ID(s).

For a local proof of concept only, `http://localhost:<port>/api/auth/callback` is accepted outside production. Production requires HTTPS.

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

The server rejects incomplete enterprise OIDC settings at startup. In enterprise mode the browser never sends a GitHub token and the existing `GITHUB_TOKEN` environment value is ignored for company repository actions.

## 4. Validate before rollout

1. Sign in with a member and non-member account: only the member may reach Studio.
2. Confirm `/api/auth/session` returns an opaque session summary and never returns an IdP token.
3. In **Integrations**, confirm the company GitHub panel has no PAT input and only installed repositories appear.
4. Attempt a private repository with the public-PAT mode: it must be rejected.
5. Start read-only, then enable a single scoped write after review.
6. Rotate the OIDC client secret and GitHub App key in the secret manager; deploy and validate again.

## Operational note

The current `SessionStore` is a replaceable server port with an in-memory development implementation. Before deploying more than one process or serverless instance, provide a shared, TTL-capable `SessionStore` implementation (for example Redis or the company session platform) and inject it into `AuthRuntime`. This is required for cross-instance sessions, immediate revocation, and resilient failover; it is deliberately not hidden behind a weak fallback.
