# Security Policy

## Supported versions

Security fixes are made against the current default branch. Releases and a versioned support window have not yet been established.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability, exposed credential, authorization bypass, unsafe local-file behavior, or vulnerability in the connector.

Before public release, maintainers must configure GitHub private vulnerability reporting or publish a monitored security contact. Until then, do not submit sensitive findings to this repository. A reporter should receive an acknowledgement, assessment, remediation plan, and coordinated disclosure timeline through that private channel.

## Security boundaries worth reviewing

- Browser workspace data and recovery snapshots are local convenience storage, not a shared source of truth.
- The local connector restricts paths to `STUDIO_ALLOWED_ROOTS`, binds to loopback, supports an optional token, and requires confirmation for consequential actions.
- GitHub, Jira, Gemini, and local-agent integrations require explicit configuration. Credentials must never be committed or placed in screenshots, fixtures, or issue reports.

These controls reduce risk but do not replace code review, operating-system permissions, repository policy, CI, or a professional security review.

## GovCloud and DoD deployment mode

Set `STUDIO_DEPLOYMENT_MODE=govcloud` or `STUDIO_DEPLOYMENT_MODE=dod` only in a
production environment. The application then fails closed unless enterprise
OIDC, explicit authorization groups, a session TTL no longer than one hour,
and `STUDIO_EXTERNAL_AI_EGRESS=disabled` are configured. Regulated API
responses are marked non-cacheable and use restrictive browser permissions.

This is an application security posture, not a FedRAMP authorization, DoD
Impact Level approval, ATO, or a substitute for an organization’s SSP, SCCA,
continuous monitoring, incident response, key-management, and boundary design.
