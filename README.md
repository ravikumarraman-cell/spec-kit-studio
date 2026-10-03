# Spec-Kit Studio

Spec-Kit Studio is a local-first workflow tool for reviewable,
specification-driven delivery. It keeps a delivery item's scope, accepted
evidence, planning artifacts, isolated implementation receipts, and handoff
connected—without treating agent output as approval or claiming that an agent
result is correct.

[Source repository](https://github.com/rraviku2_uhg/spec-kit-studio) · [Documentation](docs/README.md) · [Issues](https://github.com/rraviku2_uhg/spec-kit-studio/issues) · [Apache-2.0](LICENSE)

## What it does today

Studio supports an eight-stage Feature Journey for either a feature or one independently deliverable user story:

```text
connect repository → describe scope → ground impact → design → plan → audit
→ implement in an isolated worktree → verify and hand off
```

It also provides focused, reviewable persona workspaces:

| Workspace | Produces | Boundary |
| --- | --- | --- |
| Product Manager | Outcome, scope, acceptance evidence, and open questions | Does not approve implementation. |
| Business Analyst | Business analysis, clarified scope, assumptions, and acceptance evidence | Does not alter repository content. |
| Developer/Architect | Technical decision, guardrails, risks, and proof plan | Does not approve architecture or write code. |
| Security Researcher | Security boundary, controls, findings, mitigations, and verification evidence | Does not claim a compliance assessment. |

Accepted persona artifacts are feature-scoped, read-only inputs to the other declared persona workflows and the delivery engine. See [persona artifact consumption](docs/persona-artifact-consumption.md).

Studio distinguishes the persona that supplied a handoff from the person
responsible for the current shared delivery. Once the Feature Journey starts,
the shared Journey is the active route; the earlier persona remains visible as
read-only handoff context rather than appearing as the current workflow. See
the [Delivery experience](docs/delivery-experience.md) guide.

The optional loopback connector can inspect an allowed local repository, create a linked Git worktree, run declared checks, and launch a selected local coding agent after explicit confirmation. At completed developer delivery, it can also create a GitHub pull request through the developer's existing local `gh` sign-in—but only after the developer has committed and pushed a clean feature branch and confirms publication. Studio never creates a hidden commit, pushes a branch, merges, deploys, or approves a result.

Studio can reduce avoidable context reconstruction and make agent work easier
to review. It does not promise a fixed delivery-time improvement, code
correctness, security, compliance, or delivery success. The [delivery workflow
guide](docs/delivery-experience.md) explains the implemented controls, their
limits, and how to measure whether they help a specific team.

## SDD engine support

Studio is designed around an engine adapter boundary. **GitHub Spec Kit v1.0.6 is the only currently available strict adapter.** It validates and exports the numbered `spec`, `plan`, and `tasks` artifact layout before acceptance or export.

OpenSpec, BMAD Method, Tessl, AWS Kiro, and Custom are future-facing artifact profiles. Studio can preserve their selection and review context, but it does not claim a verified CLI adapter, validation contract, or lifecycle support for them yet. See [SDD engine adapters](docs/sdd-engine-adapters.md) and the [engine deliverable contract](docs/engine-deliverable-contract.md).

## Quick start

Requirements: Git, npm, and Node.js `>=22.6.0`. The application and scripts support Windows, macOS, and Linux.

### macOS and Linux

```bash
git clone <your-clone-url>
cd spec-kit-studio
npm install
npm run dev
```

### Windows PowerShell

```powershell
git clone <your-clone-url>
Set-Location spec-kit-studio
npm install
npm run dev
```

Validate a change or release candidate with:

```bash
npm run verify
```

For a production-oriented validation, including a built-server smoke test:

```bash
npm run verify:production
```

## A grounded first delivery

1. Start the Studio server and, if repository operations are needed, start the [local connector](docs/local-connector.md).
2. Connect and scan a repository below the connector's configured allowed root.
3. Choose a persona when focused discovery, analysis, technical design, or security evidence will help; review and accept its artifact.
4. Start a feature or strict user-story delivery item, then review each stage's evidence before advancing.
5. Create a linked worktree before local-agent implementation; run one approved task and inspect the receipt.
6. Review the developer handoff. Export the strict engine package or delivery-evidence package as needed; after normal commit and push, optionally create a GitHub PR and retain its details in the delivery-evidence package.

Browser state is local convenience data. Git and the exported, repository-relative package are the durable team record.

## Production and security boundaries

The production server exposes `GET /api/health`, uses security headers, compression, structured request IDs, and stable client-safe error envelopes. Deploy behind TLS. For multi-instance enterprise deployments, use a durable shared session-store implementation; the built-in in-memory store is not suitable for that topology.

For a repeatable long-running deployment, use the included non-root,
multi-stage [container deployment guide](docs/production-deployment.md). The
current Vercel serverless adapter intentionally supports only disabled Studio
authentication; enterprise OIDC requires a deployment with durable shared
session and transaction storage.

### PWA support

The built client is installable as a Progressive Web Application on HTTPS (or localhost). It includes a web manifest, adaptive SVG and maskable icons, and a conservative offline shell. The worker caches only same-origin application assets; API calls, connector traffic, and downloads are always network-only. This keeps credentials and mutable workspace data out of the PWA cache.

The setup is host-agnostic: its paths are relative, so it works under a domain root or a subpath. To turn it off for an embedded deployment, add this before the application bundle in `index.html`:

```html
<script>window.__SPEC_KIT_PWA__ = { enabled: false };</script>
```

`src/lib/pwa.ts` also exposes `registerPwa()` for hosts that need a custom worker URL or update behavior.

Cloud Gemini generation is optional and disabled until `GEMINI_API_KEY` is configured privately. Keep keys out of source control, browser fields, tickets, screenshots, and logs.

Production server-held Gemini, Jira, GitHub token, or GitHub App credentials require enterprise authentication. A deliberately public deployment may set `STUDIO_ALLOW_PUBLIC_SERVER_CREDENTIALS=enabled` only when an external WAF or gateway enforces suitable abuse and cost limits. The current Vercel adapter supports public mode only; enterprise OIDC requires a host with shared durable session and login-transaction storage.

The local connector binds only to loopback and should use a narrow `STUDIO_ALLOWED_ROOTS`, exact allowed origins, and a long pairing token in production mode. It is not a LAN service or remote repository proxy. Full setup and the current capability boundary are in the [local connector guide](docs/local-connector.md).

For a GovCloud or DoD deployment, use the fail-closed [regulated deployment mode](docs/regulated-deployment.md). Studio displays a persistent deployment-boundary banner on every screen when this mode is active. It is an application posture, not an ATO, FedRAMP authorization, CMMC status, or DoD SRG Impact Level determination.

## Documentation

The task-based [documentation guide](docs/README.md) is the canonical index. Particularly useful guides:

- [Feature Journey](docs/feature-journey-engine-first.md)
- [Delivery experience](docs/delivery-experience.md)
- [Personas](docs/personas.md)
- [Personas, agents, and Studio](docs/personas-and-agents.md)
- [Adding a feature to an existing repository](docs/adding_features_to_existing.md)
- [Feature isolation](docs/feature-isolation-user-guide.md)
- [Outcome Refinery](docs/outcome-refinery.md)
- [Cloud Asset Inventory mirror](docs/repository-mirroring.md)
- [Enterprise GitHub SSO/OIDC](docs/github-sso-oidc-setup.md)

## Contributing and release readiness

Read [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Keep changes narrow, preserve explicit confirmation for consequential local actions, and add focused tests. The [open-source readiness checklist](docs/open-source-readiness.md) identifies the operational work still required before a supported public release.

Machine-readable records: [llms.txt](docs/llms.txt), [CITATION.cff](CITATION.cff), and [codemeta.json](codemeta.json).
