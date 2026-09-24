# Spec-Kit Studio

## A reviewable path from a delivery request to a handoff

Spec-Kit Studio is a local-first web workspace for planning and guiding a bounded software change. It keeps the decisions around an AI-assisted change visible: the selected scope, repository evidence, reviewed artifacts, task-level receipts, verification output, and handoff package.

It does not prove that a plan or coding-agent result is correct. It helps a reviewer see what was requested, what was checked, and what still needs a human decision.

```text
Delivery request -> repository baseline -> reviewed specification -> design
                 -> ordered tasks -> one bounded implementation -> handoff
```

## Start where the work actually begins

Studio has two equal entry points into the same reviewable delivery journey. **Feature** is the default for a larger request; **User story** is for one independently deliverable use case. A story does not need to be wrapped in a feature first.

| Starting point | Use it when | What Studio keeps in scope |
| --- | --- | --- |
| **Feature** | The request includes several related stories or a larger capability. | The imported feature and its linked stories, requirements, tasks, and reviewed artifacts. |
| **User story** | One user outcome can be planned and implemented independently. | Exactly one primary story, only its selected requirements, its own artifacts, receipts, worktree record, and handoff. |

To start a user-story journey, choose **Start delivery work → User story**. Then either:

1. **Write or import** one story: paste a ticket/draft, upload `.md`, `.txt`, or `.json` source text, use the extractor if configured, and review the generated fields; or
2. **Choose existing**: search workspace stories, select one, and explicitly select the requirements that this use case delivers.

Studio requires a title, role, desired outcome, business value, and at least one acceptance criterion for a newly composed story. An existing story must have at least one selected requirement. The journey intentionally excludes sibling stories from its strict scope.

## What is in the current product

- Start delivery at either scope: an imported feature (the default) or one user story.
- Keep a durable delivery item with its own identity, selected story/requirements, artifacts, task receipts, branch, and worktree record.
- Guide review through eight stages: connect, describe, impact, design, tasks, audit, implement, and handoff.
- Export feature packages and workspace summaries; story packages retain only their selected story and mapped requirements.
- Run separate Bug Fix and Idea Assessment workflows with their own review steps and evidence packages.
- Use an optional loopback connector to inspect a local repository, preview and apply reviewed artifacts, create a linked worktree, run declared checks, and launch a selected local coding agent after explicit confirmation.
- Generate portable task prompts for Codex, Claude, GitHub Copilot CLI, Gemini, and Cursor.

## Capability map

| Area | Available functionality | Important boundary |
| --- | --- | --- |
| Repository workspace | Scan an allowed local repository for file/manifests, Git evidence, detected tools, Spec-Kit artifacts, and candidate baseline commands. | A URL or pasted request is not a substitute for repository evidence. |
| Specifications | Edit stories, functional and non-functional requirements, edge cases, success metrics, and flows; use optional Gemini routes for generation. | Generated content is a review candidate. |
| Design and delivery | Record technology choices, ADRs, API contracts, data schemas, task dependencies, and requirement mappings. | Studio does not infer that a mapping or plan is complete. |
| Quality and prompts | Run local structural checks, optionally request AI audit output, and generate task-scoped prompts for several coding agents. | Scores and prompts do not prove correctness. |
| Local implementation | Preview/apply reviewed artifacts, create linked worktrees, run supported checks, launch local agents, retain receipts, and inspect retained source changes. | Each consequential action requires confirmation; implementation uses a registered worktree. |
| Independent workflows | Run a three-step Bug Fix flow or a five-step Idea Assessment flow, with reviewed evidence and separate packages. | They do not automatically modify the Feature Journey or make release decisions. |
| Integrations | When server credentials are configured, use GitHub repository/issue/publication routes and Jira project/issue routes. | Treat credentials and remote publication as separate, explicitly configured operations. |
| Export and recovery | Download workspace, feature, story, bug-fix, or idea-assessment packages; persist workspace state in IndexedDB and retain bounded browser recovery snapshots. | Commit reviewed artifacts to preserve them across browsers and collaborators. |

Story-scoped delivery uses a strict Spec-Kit profile: Studio expects `specs/NNN-feature-name/{spec,plan,tasks}.md`, one `User Story 1`, and `T001`-style `[US1]` tasks with file paths before it permits strict story implementation.

## How work stays bounded

```text
Studio project
  -> connected repository and baseline
  -> delivery item (feature or one user story)
  -> branch + linked worktree
  -> feature-owned artifacts and implementation receipts
```

Studio stores project state in browser IndexedDB. On first use it migrates the previous `localStorage` project payload only after IndexedDB has committed it. Browsers that do not offer IndexedDB use the legacy localStorage fallback. Optional recovery snapshots remain in localStorage, but Studio prunes them on startup, every snapshot write, and every six hours while the app is open: snapshots older than seven days, more than three per project, or more than twelve total are deleted. This is convenient local state, not a shared source of truth. Export and commit the reviewed package with the implementation if it needs to persist across browsers or collaborators.

The connector confines repository paths to `STUDIO_ALLOWED_ROOTS`, binds only to `127.0.0.1`, supports an optional token, and requires explicit confirmation for writes, worktree creation, tool installation, checks, and local-agent execution. Those controls reduce accidental actions; they do not replace code review, repository policy, CI, or a security review.

## Quick start

Requirements: Node.js 22.12.0 or later within Node 22 (the package declares `>=22.12.0 <23`), npm, and Git. Local agents are optional.

```bash
git clone <your-clone-url>
cd spec-kit-studio
npm install
npm run dev
```

Validate the application before a release or merge:

```bash
npm run verify
```

`verify` runs TypeScript checking, the Node test suite, and a production build.

## Production server

```bash
npm ci
npm run verify
NODE_ENV=production npm start
```

| Variable | Default | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | unset | Enables Gemini-backed generation and audit routes when configured. |
| `HOST` | `0.0.0.0` | HTTP bind address. |
| `PORT` | `3000` | HTTP port. |
| `REQUEST_BODY_LIMIT` | `10mb` | Maximum JSON request size. |
| `SHUTDOWN_GRACE_PERIOD_MS` | `10000` | Graceful-shutdown deadline. |

The Express server uses security headers, compression, request IDs, and request telemetry. Run it behind TLS in production. `GET /api/health` is the health endpoint.

## Optional local connector

The connector is the boundary between the browser application and a local repository.

```env
STUDIO_ALLOWED_ROOTS="/absolute/path/to/your/repos"
STUDIO_CONNECTOR_TOKEN="use-a-long-random-value"
STUDIO_ALLOWED_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"
```

```bash
npm run connector
```

Set `STUDIO_ALLOWED_ROOTS` to the narrowest parent directory that contains the repositories you intend to connect. In **Connected Workspace**, scan a repository before starting delivery work. See [the connector guide](docs/local-connector.md) for its exact capabilities and constraints.

For a hosted deployment using the current loopback connector, set `STUDIO_CONNECTOR_MODE=production`. It then requires explicit absolute allowed roots, exact HTTPS origins, and a token with at least 32 bytes; it will not fall back to development defaults. This is a hardened bridge, not a multi-tenant companion service. See [production deployment and user-owned agents](docs/production-deployment-and-user-owned-agents.md) and [the production-readiness ledger](docs/production-readiness-progress.md) for the implemented boundary, target architecture, and remaining gates.

## A grounded first run

1. Connect and scan the repository; inspect the detected Git and technology evidence.
2. Start feature delivery, or select/import one user story.
3. Review the scope, impact map, plan, tasks, and audit findings rather than treating generated output as approved.
4. Create and register a linked worktree before local-agent implementation.
5. Run one approved task, inspect the changed files and focused verification result, and retain its receipt.
6. Review the handoff and commit the exported, repository-relative artifacts with the implementation.

## Documentation

- [Feature journey](docs/feature-journey-engine-first.md) explains the actual eight-stage review model.
- [Story-first delivery status](docs/user-story-first-workflow-implementation-plan.md) distinguishes the implemented contract from future ideas.
- [Feature isolation guide](docs/feature-isolation-user-guide.md) covers concurrent work and worktrees.
- [Local connector](docs/local-connector.md) describes local access, confirmations, and boundaries.
- [Vercel-hosted Studio with local agents](docs/vercel-local-connector-guide.md) is the step-by-step deployment and pairing guide.
- [Production deployment and user-owned agents](docs/production-deployment-and-user-owned-agents.md) explains billing, identity, Companion, and control-plane requirements.
- [Architecture](docs/architecture.md) and [modular architecture](docs/modular-architecture.md) describe code boundaries.

## Contributing

Contributions are welcome. Start with the [contribution guide](CONTRIBUTING.md), read the [code of conduct](CODE_OF_CONDUCT.md), and report security concerns according to [SECURITY.md](SECURITY.md). Keep changes narrow, preserve explicit confirmation around consequential local actions, and add a focused regression test for workflow rules. Run `npm run verify` before submitting a change.

## Open-source readiness

This repository has contributor, security, and community documentation, but it does **not** yet contain a license file. Until the maintainers select and add a license, the code is not licensed for public reuse, modification, or redistribution. See [the publishing checklist](docs/open-source-readiness.md) for the remaining maintainer decisions and the concrete release sequence.
