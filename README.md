# Spec-Kit Studio

**A visual, evidence-first control plane for adding a well-specified, reviewable feature to any existing repository.**

Studio combines a web app with an optional loopback-only local connector. It guides a team from feature intent to feature-scoped Spec-Kit artifacts, an ordered delivery plan, a bounded local coding-agent task, and a human-reviewed verification record.

Studio never silently edits a repository, creates a branch, commits, pushes, or marks agent work complete for you.

> **Start here:** [Quick start](#quick-start) → [Feature journey](#the-feature-journey) → [Run a local task](#run-a-task-locally) → [Review and hand off](#review-and-hand-off)

## What Studio gives you

| Need | Studio provides |
| --- | --- |
| Understand an unfamiliar repository | A read-only truth layer: Git state, manifests, technologies, available baseline checks, Spec-Kit status, and local-agent readiness. |
| Add a feature without losing context | A feature inbox plus feature-scoped spec, impact evidence, architecture plan, and delivery tasks. |
| Use Spec-Kit deliberately | An Engine-first eight-stage journey with a clear next action and review point at every consequential boundary. |
| Run a local coding agent safely | A scoped Codex, Claude Code, or Copilot CLI handoff—one task per run, workspace writes only, no automatic commit or push. |
| Retain trustworthy evidence | Live agent status, redacted output, changed files, verification output, and human-reviewed implementation receipts. |
| Work across technologies | Repository grounding and baseline detection for JavaScript/TypeScript, Python, Go, Rust, Java, .NET, Ruby, PHP, Docker, and more. |

## The mental model

Studio is the control plane; your repository remains the source of code; Spec-Kit artifacts remain the source of planned work; and the local agent performs the bounded task.

```text
Feature request
  → Repository evidence
  → Feature spec and impact map
  → Feature architecture plan
  → Feature delivery tasks
  → One local agent task
  → Human review + repository verification
  → Handoff
```

Studio keeps **current feature evidence** separate from older shared workspace artifacts. A previous plan or task board cannot be presented as proof for a new feature.

## Quick start

### 1. Prerequisites

- **Node.js 22.12 or later** (the supported range is Node 22).
- npm.
- Git, for the most useful repository evidence.
- Optional: `codex`, `claude`, or `copilot` CLI if Studio should run a local coding agent. Studio detects what is actually available after a repository scan.

### 2. Install and start Studio

```bash
git clone <your-clone-url>
cd spec-kit-studio
npm install
npm run dev
```

Open the local URL printed by the dev server (normally `http://localhost:3000`). Before deployment, run:

```bash
npm run verify
```

This runs TypeScript checks, automated tests, and a production build.

### 3. Start the local connector

The browser cannot safely read or edit arbitrary local folders. The connector is the intentionally small, local bridge for repository evidence and local agents.

Copy `.env.example` to `.env.local`, then set a parent directory containing only repositories you intend Studio to access:

```env
STUDIO_ALLOWED_ROOTS="/absolute/path/to/your/repos"
STUDIO_CONNECTOR_TOKEN="use-a-long-random-value"
STUDIO_ALLOWED_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"
```

In a second terminal, from the Studio repository:

```bash
npm run connector
```

In Studio, open **Connected Workspace**, enter the repository’s absolute path and—when configured—the pairing token, then select **Scan repository**. Scanning is read-only.

> The repository path must be inside `STUDIO_ALLOWED_ROOTS`. For `/Users/me/develop/my-service`, set `/Users/me/develop` as the allowed root—not your whole home directory.

For a hosted Studio URL, add that URL to `STUDIO_ALLOWED_ORIGINS` and keep the connector on the user’s own machine. See [Local Connector](docs/local-connector.md) for full setup and safety details.

## The feature journey

The left navigation is a journey map: it shows the current stage, what is complete, and one primary next action. Completed stages can always be reopened and edited; meaningful changes should be reviewed again.

| Stage | Goal | What you do | Evidence Studio retains |
| --- | --- | --- | --- |
| 1. Connect safely | Establish a known baseline. | Scan the repository and review Git state, available checks, and tooling. | Repository evidence and baseline results. |
| 2. Describe feature | Agree on outcome and boundaries. | Import a PRD, issue, URL, or pasted requirements; review stories and requirements. | Feature inbox item and feature spec. |
| 3. Ground impact | Understand what could be affected. | Review owning paths, neighbors, tests, contracts, and applicable rules. | Feature-scoped impact evidence. |
| 4. Design safely | Agree on a compatible design. | Review the feature’s `plan.md`; run the selected Engine/agent if needed. | Feature-scoped architecture plan. |
| 5. Plan delivery | Make implementation executable. | Review dependency-ordered `tasks.md` and requirement mappings. | Feature-scoped delivery plan. |
| 6. Quality gate | Catch cross-artifact gaps before code changes. | Run the audit and resolve blockers at their owning stage. | Audit result and decisions. |
| 7. Implement | Complete one bounded task safely. | Submit the next task to a local agent, then review evidence. | Agent output, changed files, verification result, and a reviewed receipt. |
| 8. Verify & hand off | Make the change durable and reviewable. | Review remaining work, Git evidence, checks, and exports. | Handoff-ready artifacts and verification evidence. |

### Add a feature to an existing repository

1. In **Connected Workspace**, scan a clean clone of the target repository.
2. Choose **Import feature** from the Feature Inbox or journey.
3. Paste requirements, upload a document, or provide a supported issue/URL.
4. Choose **Prepare Spec-Kit Engine Work Packet** for the Engine-first path.
5. Review stories and requirements, then merge into the connected workspace.
6. Follow the highlighted next stage. Studio retains current-feature scope so the new plan and tasks cannot be confused with existing workspace work.

Read the deeper guide: [Feature Journey: Engine-First Workflow](docs/feature-journey-engine-first.md).

## Run a task locally

Stage 7 is deliberately simple:

1. Open **AI Agent Prompts** from the journey.
2. Studio automatically selects the next unfinished, unreviewed feature task. Completed or recorded tasks are not the default run target.
3. Select an available local agent: **Codex CLI**, **Claude Code**, or **GitHub Copilot CLI**.
4. Select **Run with _agent_ locally**, then approve the browser confirmation.
5. Watch live status and elapsed time. You can stop a running task safely.
6. Review changed files and output, run independent repository checks when appropriate, then check the review box and select **Record reviewed implementation**.

Studio writes only inside the connected repository. It does not commit, push, switch branches, or mark a task complete merely because an agent says it finished.

### Minimal-intervention defaults

Some planning tasks contain operational policy choices. Studio applies conservative, visible defaults so the normal path remains **select task → run task**. If your organization uses a different policy, open **Review or change operational defaults**; the selected policy is saved per feature/task and included in the handoff.

### See completed work without rerunning it

In **AI Agent Prompts**, open **Completed & reviewed work**. It stays collapsed to keep the next task in focus. For each recorded task it shows:

- task ID, title, and review timestamp;
- produced or changed files, including newly created files;
- retained agent and verification output; and
- the Git diff summary, when Git can provide one.

The files remain at the shown paths in the connected repository. The receipt is an audit record, not a second copy of the code.

## Local agents and Spec-Kit Engine

Studio is Engine-first, but it never pretends a CLI is installed or authenticated. A repository scan detects usable local agents; Settings lets the user choose a preferred available agent.

| Agent | Studio action |
| --- | --- |
| Codex CLI | Runs a scoped local task through the connector. The default non-interactive model is `gpt-5.6-luna`; override `STUDIO_CODEX_MODEL` only when your account supports another model. |
| Claude Code | Runs a scoped local task when installed and authenticated. |
| GitHub Copilot CLI | Runs a scoped local task when installed and authenticated. |
| Gemini, Cursor, Windsurf/Aider | Produces a portable, feature-scoped handoff to copy into that tool. |

Connected Workspace can check official Spec-Kit availability and guide explicit setup. It never silently initializes a repository or overwrites official Spec-Kit content.

## Safety and privacy

The local connector is designed for private repositories and follows these constraints:

- Binds only to `127.0.0.1`.
- Accepts browser requests only from configured Studio origins.
- Resolves paths and rejects those outside `STUDIO_ALLOWED_ROOTS`.
- Requires a pairing token when one is configured.
- Redacts common credential patterns from returned command output.
- Uses discovered or allowlisted baseline commands instead of arbitrary browser-issued shell commands.
- Requires explicit confirmation for repository writes, installs, and local agent runs.
- Captures evidence but never commits, pushes, or creates branches.

Do not put API keys in `VITE_*` variables. Gemini, GitHub, and Jira credentials are server-side configuration only. See the annotated [.env.example](.env.example).

## Repository support and baseline checks

Studio does not require an npm project. A scan discovers suitable baseline checks from repository conventions, including npm scripts, Python pytest, Go test, Cargo test, Maven/Gradle test, and .NET test commands.

If it cannot find a supported check, Studio says so and lets you record a manual baseline. It does not invent an npm command for a non-npm project. Pre-existing failures remain visible and are not attributed to the feature.

## Deploy on Vercel

Studio can deploy as a Vercel web app. Import the repository into Vercel; [`vercel.json`](vercel.json) supplies build and routing configuration.

Set only the server-side integrations you use:

| Variable | Required | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | Only for Gemini generation | Keeps Gemini access server-side. |
| `GITHUB_TOKEN` | Optional | Enables configured GitHub integration actions; use a scoped, short-lived token. |
| `JIRA_DOMAIN`, `JIRA_EMAIL`, `JIRA_API_TOKEN` | Optional | Enables configured Jira actions. |
| `APP_URL` | Optional | Public URL for integrations that need it. |

Vercel cannot access a user’s filesystem. Connected Workspace remains local: every user runs their own connector and allows the hosted origin with `STUDIO_ALLOWED_ORIGINS`.

## Troubleshooting

| Message or symptom | What to do |
| --- | --- |
| `Repository path is outside STUDIO_ALLOWED_ROOTS` | Add the repository’s intended parent folder to `STUDIO_ALLOWED_ROOTS`, restart the connector, then scan again. |
| `Connector token is required` | Enter the same value used for `STUDIO_CONNECTOR_TOKEN` in Connected Workspace. Never paste it into an agent prompt. |
| `spawn uv ENOENT` | Use Connected Workspace’s guided uv setup or your organization’s approved installer. |
| A local agent is “not logged in” | Authenticate that CLI in a terminal, then rescan so Studio refreshes readiness. |
| No files shown after an agent run | Open live agent output. New/untracked files are captured for new runs; older receipts may require inspecting artifact paths in the repository. |
| No supported baseline checks | Informational only: record a manual baseline or add a project-native check. |

## Project layout

```text
src/                 React application and reusable domain components
src/components/      Journey, workspace, artifact, audit, prompt, and export surfaces
src/lib/             Shared workflow, connector, prompt, and evidence logic
connector/server.mjs Loopback-only local repository connector
api/                 Hosted API entry point
docs/                Workflow and operational guides
tests/               Node test suite
```

## Documentation

- [Feature journey, ownership, and review loops](docs/feature-journey-engine-first.md)
- [Local connector setup and safety model](docs/local-connector.md)
- [Efficient Codex CLI feature execution](docs/codex-cli-feature-execution-plan.md)
- [Adding features to an existing repository](docs/adding_features_to_existing.md)

## Contributing

Before submitting a change:

```bash
npm run verify
```

Keep feature evidence scoped, avoid silently changing user repositories, and add regression tests whenever workflow behavior changes.
