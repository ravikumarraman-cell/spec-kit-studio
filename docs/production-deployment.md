# Production deployment

This guide describes how to operate the current Studio build in production. It
does not make a security, compliance, availability, or delivery-time claim for
an environment that has not been reviewed and operated by its owner.

## Supported packaging path

The repository includes a multi-stage `Dockerfile` for a long-running Node
service. The runtime image contains only production dependencies and built
assets, runs as the unprivileged `node` user, and exposes an unauthenticated
`GET /api/health` probe. The health response contains public deployment
posture only; it does not return secrets, identity claims, or repository data.

Build the image with the committed public npm registry configuration. No
registry credential or build secret is required.

```bash
docker build --tag spec-kit-studio:local .

docker run --rm --init -p 3000:3000 \
  --env-file /absolute/path/to/production.env \
  spec-kit-studio:local
```

The repository `.npmrc` pins all dependency installs to the public npm
registry and contains no credential.

Use `/api/health` for container readiness and liveness. Terminate TLS at the
ingress/load balancer and expose the service only through that trusted edge.

## Required production decisions

Before deployment, the service owner must choose and provide:

1. **Identity mode.** Production with server-side credentials requires
   `STUDIO_AUTH_MODE=enterprise`, unless the owner deliberately enables the
   narrowly named public override. Enterprise mode requires a durable shared
   session and OIDC transaction store.
2. **Session store.** The in-memory store is suitable for one local process
   only. Use an encrypted, durable, shared store before running multiple
   replicas or relying on session revocation across restarts.
3. **Secrets and access.** Supply OIDC, GitHub App, optional GitHub OAuth,
   Jira, and model credentials from the platform’s secret manager. Do not put
   them in source control, browser configuration, container images, or logs.
4. **Ingress controls.** Require HTTPS, configure the public Studio URL and
   OIDC redirect URI exactly, apply an edge rate limit/WAF, and preserve the
   existing security headers and API `no-store` behavior.
5. **Observability and recovery.** Route structured server logs to the
   organization’s protected log service; define alert ownership, backup and
   restore for the session store, and an incident runbook.

The optional local connector remains a separate process on the developer’s
machine. Do not deploy it beside the hosted Studio service or expose it on a
network. It must keep narrow allowed roots, an explicit pairing token, and an
allowed-origin list containing the deployed Studio origin.

## Vercel boundary

The included Vercel configuration is appropriate only for
`STUDIO_AUTH_MODE=disabled`. The code intentionally refuses enterprise mode on
the current Vercel serverless adapter because it has no durable shared session
and OIDC transaction store. Use the container path, or implement and review a
durable serverless session/transaction adapter, for enterprise deployment.

## Release gate

Run these checks from a clean checkout before promoting an image:

```bash
npm ci
npm run verify:production
```

`verify:production` runs the type check, tests, production build, bundle
budget, browser checks, production-server smoke test, and production
dependency audit. It validates this repository; it does not validate cloud
networking, identity-provider configuration, secrets, backups, or operational
ownership.

## Environment reference

Start from [`.env.example`](../.env.example). For enterprise deployment, at a
minimum configure:

```text
NODE_ENV=production
HOST=0.0.0.0
PORT=3000
STUDIO_AUTH_MODE=enterprise
STUDIO_SESSION_SECRET=<secret-manager value, at least 32 characters>
STUDIO_OIDC_ISSUER=https://identity.example.com/<tenant>/v2.0
STUDIO_OIDC_CLIENT_ID=<client ID>
STUDIO_OIDC_CLIENT_SECRET=<secret-manager value>
STUDIO_OIDC_REDIRECT_URI=https://studio.example.com/api/auth/callback
STUDIO_OIDC_REQUIRED_GROUP_IDS=<authorized group ID>
```

Add GitHub, Jira, and model credentials only when the corresponding capability
is intentionally enabled. The server fails closed for incomplete enterprise
OIDC configuration and for production server credentials when enterprise
authentication is disabled.

For regulated deployments, also follow [regulated deployment](regulated-deployment.md).
