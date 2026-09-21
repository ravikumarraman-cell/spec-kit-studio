# Spec-Kit Studio

## Turn AI code generation into accountable software delivery

**Spec-Kit Studio is the evidence-first control plane for teams that want AI to accelerate software delivery without surrendering engineering judgment.**

AI coding agents can write remarkably capable code. The hard problem is not generating a diff—it is generating the *right* diff, in the right repository, for the right requirement, with the right constraints, and with enough evidence that a human can trust the result.

Spec-Kit Studio makes that discipline practical. It guides a feature from intent to verified handoff through an eight-stage, AI-assisted workflow. At every consequential point, it captures the context an agent needs, keeps the work scoped to the active feature, and leaves approval with the people accountable for the product.

> **The promise:** less time rediscovering context, fewer expensive rework loops, faster reviews, and AI-generated code that arrives with a reason to believe it is correct.

```text
Feature intent → repository truth → specification → impact map → safe design
      → delivery plan → bounded AI task → evidence-based verification → handoff
```

## Why this matters

The cost of modern software delivery is rarely the keystrokes required to write code. It is the coordination tax around those keystrokes:

- Reconstructing how an unfamiliar repository works.
- Translating a request into requirements an engineer and an agent interpret the same way.
- Discovering architectural constraints after implementation has already begun.
- Reviewing broad, ambiguous AI-generated changes without a reliable link to a plan.
- Repeating the same context gathering for every task, reviewer, and handoff.

Spec-Kit Studio attacks that tax directly. It turns implicit knowledge into durable, feature-scoped evidence before implementation; gives an AI agent a single bounded task instead of an open-ended instruction; and records what changed and how it was checked afterward.

| Without a control plane | With Spec-Kit Studio |
| --- | --- |
| “Build this feature” is an ambiguous prompt. | A feature has reviewed stories, requirements, constraints, design, and dependency-ordered tasks. |
| The agent infers repository conventions ad hoc. | Studio first captures repository truth, baseline checks, available tools, and applicable guardrails. |
| Reviews begin with “what was this supposed to do?” | Reviewers receive the task, changed files, verification evidence, and retained decision record. |
| Old plans are easily mistaken for the new feature’s plan. | Current-feature evidence is explicitly separated from shared workspace history. |
| Agent completion is treated as success. | A human records completion only after reviewing evidence. |

This is not a process layer added for its own sake. It is a way to make the development lifecycle shorter by moving uncertainty—and the conversations needed to resolve it—*upstream*, when correction is cheap.

## The development-life-cycle advantage

Studio compresses the delivery cycle by making each transition explicit and reusable.

```text
        Clarify once                 Ground once                Review once
Request ─────────────→ Spec ─────────────────→ Plan ─────────────────→ Code
                         │                       │                      │
                         └──── reusable evidence ┴──── bounded prompt ─┘
                                                                         │
                                              Verification + handoff ◀──┘
```

| Lifecycle friction | Studio mechanism | Practical outcome |
| --- | --- | --- |
| Repository onboarding | Read-only scan of Git state, technology evidence, checks, Spec-Kit status, and runnable agents. | Engineers and agents start from facts instead of archaeology. |
| Requirement drift | Imported feature briefs become structured stories, requirements, boundaries, and success measures. | Less “that is not what I meant” rework. |
| Design churn | A feature-scoped impact map and `plan.md` are reviewed before implementation. | Constraints are discovered before a broad diff exists. |
| Task ambiguity | `tasks.md` maps delivery work to requirements and dependencies. | AI agents receive a small, executable contract rather than a vague project goal. |
| Review overload | Changed files, command results, verification output, and receipts stay attached to the task. | Review starts with evidence, not reconstruction. |
| Handoff loss | The final package preserves the specification, plan, tasks, governance, and verification trail. | The next engineer inherits context, not just code. |

## The feature journey: from first scan to durable handoff

The Studio interface is intentionally organized around **one clear next step**. The full route is always available, but the active stage is the focus. AI may prepare work at any stage; it never advances the journey by itself.

| Stage | The question it answers | What Studio helps you do | Evidence retained |
| --- | --- | --- | --- |
| **1. Connect safely** | What is true about this repository right now? | Scan the repository, Git state, toolchain, tests, and baseline health. | Repository truth and baseline record. |
| **2. Describe the feature** | What outcome are we trying to create without breaking? | Import a PRD, ticket, URL, document, or notes; review stories and requirements. | Feature inbox receipt and feature specification. |
| **3. Ground the impact map** | Where does this feature belong and what can it affect? | Identify owning paths, neighboring code, tests, contracts, schemas, and rules. | Feature-scoped impact evidence. |
| **4. Design safely** | What is the smallest compatible technical design? | Review or prepare a feature-scoped `plan.md` with APIs, components, risks, tests, and rollback considerations. | Accepted feature architecture plan. |
| **5. Make delivery actionable** | What must happen, in what order, and how is it traced? | Review dependency-ordered `tasks.md` with requirement mappings and verification work. | Accepted feature delivery plan. |
| **6. Pass the quality gate** | Are the artifacts internally consistent enough to begin code? | Run a cross-artifact audit and resolve or explicitly own blocking gaps. | Audit findings and decisions. |
| **7. Implement deliberately** | Can an agent safely execute one approved piece of work? | Send one selected task to Codex, Claude Code, or Copilot; inspect output and evidence. | Changed files, agent output, checks, and a human-reviewed implementation receipt. |
| **8. Verify & hand off** | Can someone else understand, validate, and safely continue this change? | Compare the result with the approved work, review final evidence, and export the package. | Handoff-ready artifacts and verification trail. |

### The critical design principle: AI is powerful, but bounded

At Stage 7, Studio does not ask an agent to “finish the feature.” It supplies a reviewed, task-scoped contract informed by the feature, constitution, architecture, delivery plan, and repository context. The agent can work quickly; the scope remains legible.

```text
Approved feature plan
  + accepted task
  + repository guardrails
  + operational defaults
  + focused verification request
  = a bounded AI implementation handoff
```

That distinction is how teams move faster *and* retain control.

## What Studio does for every role

| Role | What becomes easier |
| --- | --- |
| Product and delivery leaders | A request becomes a reviewable path from desired outcome to verified implementation, not a black-box agent run. |
| Staff engineers and architects | Design, compatibility, risk, contracts, and rollback concerns are made visible before implementation. |
| Feature developers | Less context switching: Studio presents the next meaningful action and retains prior evidence. |
| AI-assisted developers | Codex, Claude Code, and Copilot get focused prompts with enough context to be useful without unconstrained repository-wide authority. |
| Reviewers | The “why,” expected scope, changed files, and verification record arrive together. |
| New maintainers | The handoff preserves decisions and traceability instead of requiring repository archaeology. |

## Core capabilities

### Repository truth before generation

Connected Workspace is a read-only grounding layer. It discovers repository structure, Git status, technology evidence, likely baseline checks, official Spec-Kit status, and locally available coding agents. It supports JavaScript/TypeScript, Python, Go, Rust, Java, .NET, Ruby, PHP, Docker, and more.

No guessed test command. No invented architecture. No blind AI run.

### Feature intake that turns intent into engineering artifacts

Import feature context from text, PRDs, documents, issue URLs, or reusable presets. Studio helps shape it into user stories, functional requirements, acceptance criteria, edge cases, and success measures before design and implementation begin.

### Feature-scoped plans, not generic documentation

Studio keeps active feature evidence distinct from older, shared workspace artifacts. A plan or task board from a previous feature is never silently treated as proof for the current one. This prevents one of the most subtle sources of AI-assisted delivery mistakes: applying correct context to the wrong change.

### Controlled local AI execution

Studio supports local **Codex CLI**, **Claude Code**, and **GitHub Copilot CLI** execution when those tools are installed and authenticated. It also creates portable handoffs for Gemini, Cursor, Windsurf, and Aider.

- One task per local run.
- Writes are confined to the connected repository.
- Every write, install, or agent run requires explicit confirmation.
- Studio never commits, pushes, creates branches, or self-certifies completion.
- Human review is required before a receipt is recorded.

### Evidence that makes review faster

For a completed task, Studio can retain agent output, changed files—including newly created files—Git diff summaries, verification output, operational decisions, and the reviewer’s implementation receipt. This converts “the agent said it is done” into a concrete review packet.

### Quality gates and exportable handoff

Before implementation, Studio audits consistency across the spec, plan, tasks, and constitution. At the end, it packages the feature’s Spec-Kit artifacts for durable handoff and repeatable collaboration.

## Quick start

### Prerequisites

- **Node.js 22.12 or later** (supported range: Node 22).
- npm and Git.
- Optional: `codex`, `claude`, or `copilot` CLI for local agent execution.

### Start Studio

```bash
git clone <your-clone-url>
cd spec-kit-studio
npm install
npm run dev
```

Open the local URL printed by the dev server. Before shipping changes, run:

```bash
npm run verify
```

This runs TypeScript checks, the Node test suite, and a production build.

### Connect the local repository bridge

Browsers should not have arbitrary filesystem access. The optional local connector is a deliberately small, loopback-only bridge for repository evidence and local agents.

Copy `.env.example` to `.env.local`, then allow only the parent directories that contain repositories you intend Studio to access:

```env
STUDIO_ALLOWED_ROOTS="/absolute/path/to/your/repos"
STUDIO_CONNECTOR_TOKEN="use-a-long-random-value"
STUDIO_ALLOWED_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"
```

Run it in another terminal:

```bash
npm run connector
```

Then open **Connected Workspace** in Studio, enter the repository path and pairing token when configured, and select **Scan repository**. Scanning is read-only.

> For `/Users/me/develop/my-service`, set `/Users/me/develop` as the allowed root—not your entire home directory.

## A practical first feature

1. **Scan a clean clone** in Connected Workspace and record the baseline.
2. **Describe the feature** by importing the request, PRD, ticket, or requirements.
3. **Review the generated stories and requirements** before they enter the project.
4. **Ground the impact map** to identify the code, tests, contracts, and guardrails that matter.
5. **Review the feature plan and delivery tasks**, then resolve audit blockers.
6. **Open AI Agent Prompts**. Studio selects the next unfinished, unreviewed feature task by default.
7. **Run one local task** with an available agent, review its evidence, run focused checks, and record the reviewed receipt.
8. **Verify and hand off** the resulting artifacts and repository evidence.

The important result is not merely that code was generated. It is that the generated code is traceable to a requirement, a reviewed plan, a bounded task, and a verification record.

## Safety and privacy are product features

The local connector is designed for private repositories and intentionally limits authority:

- Binds only to `127.0.0.1`.
- Restricts browser access to configured origins.
- Rejects paths outside `STUDIO_ALLOWED_ROOTS`.
- Supports a pairing token without persisting it in Studio settings.
- Redacts common credential patterns from returned output.
- Uses discovered or allowlisted baseline commands instead of arbitrary browser-issued shell commands.
- Requires explicit confirmation for writes, installations, and agent execution.
- Never stages, commits, pushes, or creates branches.

Do not place secrets in `VITE_*` variables. Gemini, GitHub, and Jira credentials are server-side configuration only. See [.env.example](.env.example) and [Local Connector](docs/local-connector.md).

## Architecture: built for trust and evolution

```text
React screens → workflow hooks → pure domain libraries → browser storage
                                      ↓
                            typed local connector client
                                      ↓
                         loopback-only repository boundary
```

The application is deliberately modular:

- `components/journey` owns stages, approvals, and handoffs.
- `components/workspace` owns connection, setup, and repository baseline.
- `components/import` owns feature intake and artifact parsing.
- `components/prompt` owns task selection, agent execution UI, and review receipts.
- `lib/` owns pure workflow rules, transformations, connector contracts, and policy decisions.
- `connector/server.mjs` owns allowlists, path confinement, redaction, and local process boundaries.

See [Architecture](docs/architecture.md) and [Modular architecture](docs/modular-architecture.md).

## Deploying the web application

The Studio web app can be deployed to Vercel using [`vercel.json`](vercel.json). The connector remains on each user’s own machine; a hosted web app never gains direct access to a user’s filesystem.

Set only the server-side integrations you use:

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Gemini-backed generation. |
| `GITHUB_TOKEN` | Optional configured GitHub integration. Use a scoped, short-lived token. |
| `JIRA_DOMAIN`, `JIRA_EMAIL`, `JIRA_API_TOKEN` | Optional Jira Cloud integration. |
| `APP_URL` | Public URL for integrations that require it. |

For hosted Studio, add the site URL to `STUDIO_ALLOWED_ORIGINS` on the user’s local connector.

## Documentation

- [Feature journey and Engine-first workflow](docs/feature-journey-engine-first.md)
- [Local connector setup and safety model](docs/local-connector.md)
- [Efficient Codex CLI feature execution](docs/codex-cli-feature-execution-plan.md)
- [Adding features to an existing repository](docs/adding_features_to_existing.md)

## Contributing

Before submitting a change:

```bash
npm run verify
```

Preserve the central contract: keep feature evidence scoped, require explicit approval for consequential actions, never silently modify a user repository, and add regression tests whenever workflow behavior changes.

---

**Spec-Kit Studio does not replace engineering judgment. It gives engineering judgment the leverage to direct AI at the speed of modern software delivery.**
