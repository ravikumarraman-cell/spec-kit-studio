# Security and Trust

Studio is designed to make agent-assisted work inspectable, not autonomous by default. Its controls reduce accidental actions; they do not replace repository policy, CI, review, or a security assessment.

## Trust boundaries

### Browser workspace

Project state is stored in browser IndexedDB. Optional recovery snapshots are bounded and pruned. Export and commit reviewed artifacts when they must persist across browsers or collaborators.

### Local connector

The connector:

- binds to loopback only;
- confines paths to `STUDIO_ALLOWED_ROOTS`;
- supports token authentication and exact origin controls;
- requires confirmation for writes, worktrees, checks, installations, agent
  execution, and optional PR publication;
- keeps repository access on the user's machine.

### Server integrations

- Gemini routes remain disabled until a real key is configured.
- Enterprise GitHub uses a server-side App installation and OIDC session.
- Session-only personal tokens are not persisted to browser storage.
- Jira credential-bearing requests are limited to Atlassian Cloud or an explicitly configured host.
- API failures use stable envelopes without exposing internal details.

### Regulated deployment context

GovCloud and DoD modes fail closed: enterprise access is required and external
AI egress is disabled until an approved in-boundary adapter is configured.
Studio displays this boundary on every screen. It is an operating-context
indicator, not an ATO, FedRAMP, CMMC, or DoD SRG claim.

## Operator responsibilities

1. Keep `.env.local`, tokens, and keys out of Git and support channels.
2. Configure the narrowest possible allowed repository roots.
3. Review generated specifications and tasks before implementation.
4. Inspect changed files and command output before accepting a run.
5. Use branch protection, CI, secret scanning, and dependency review in GitHub.
6. Report suspected vulnerabilities privately under the project security policy.

## Report a vulnerability

Follow [SECURITY.md](https://github.com/rraviku2_uhg/spec-kit-studio/blob/main/SECURITY.md). Do not open a public issue containing exploit details, credentials, or private repository data.

## Canonical references

- [Security policy](https://github.com/rraviku2_uhg/spec-kit-studio/blob/main/SECURITY.md)
- [Regulated deployment boundaries](https://github.com/rraviku2_uhg/spec-kit-studio/blob/main/docs/regulated-deployment.md)
- [Enterprise GitHub SSO/OIDC](https://github.com/rraviku2_uhg/spec-kit-studio/blob/main/docs/github-sso-oidc-setup.md)
- [Local connector protocol](https://github.com/rraviku2_uhg/spec-kit-studio/blob/main/docs/local-connector.md)

---

[Project site](https://rraviku2-uhg.github.io/spec-kit-studio/#boundaries) · [[Home]] · [[Local Connector]]
