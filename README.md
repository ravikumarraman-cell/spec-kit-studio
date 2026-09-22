# Spec-Kit Studio

## Deliberate software delivery with coding agents

Spec-Kit Studio takes a feature from request to reviewable handoff without losing the reasoning in between. It does not claim an agent is correct. It makes the evidence, boundaries, and human decisions around an agent run visible enough to review.

```text
Feature request → repository evidence → scoped design → ordered tasks
                → one bounded implementation → verification → handoff
```

The useful outcome is not a large generated diff. It is a change that can answer what was intended, which repository constraints applied, what task changed what, what was checked, and how the next engineer can continue safely.

## What Studio provides

- Eight human-approved stages: connect, describe, impact, design, tasks, audit, implement, and handoff.
- Feature-scoped impact maps, plans, task plans, audits, and implementation receipts.
- One repository identity and stack profile per Studio project.
- A feature key, branch, linked worktree, and `specs/<feature-slug>/` package per active feature.
- Reviewed artifact writes: feature packages go only to `specs/<feature-slug>/`; workspace summaries go to `.specify/studio/`.
- Local recovery snapshots and portable feature-only exports.

## The eight-stage journey

| Stage | Outcome | Evidence retained |
| --- | --- | --- |
| 1. Connect safely | Known repository baseline | Git, technology, and check evidence |
| 2. Describe | Reviewed behavior and boundaries | stories, requirements, source receipt |
| 3. Ground impact | Known owners, neighbours, rules, risks | impact map |
| 4. Design safely | Compatible design | feature `plan.md` |
| 5. Plan delivery | Traceable work order | feature `tasks.md` |
| 6. Quality gate | Material gaps resolved | audit record |
| 7. Implement deliberately | One approved task | changed files and receipt |
| 8. Verify & hand off | Durable continuation record | package and verification trail |

## Concurrent features, without shared-checkout mistakes

Use one Studio project per repository. Use one feature key, branch, linked worktree, and namespace per active feature.

```text
Studio project → repository → stack profile
       └── feature key → branch + linked worktree → specs/<feature-slug>/
```

The Feature Registry exposes active features, branches, receipts, and declared source-path overlap. Shared APIs, migrations, lockfiles, IaC state, and runtime flags should be recorded as dependencies—not independently changed by two features.

Read the [multi-project operating model](docs/multi-project-feature-isolation-operating-model.md) and the [feature isolation user guide](docs/feature-isolation-user-guide.md).

## Quick start

Requirements: Node.js 22.12+, npm, and Git. Codex, Claude Code, and GitHub Copilot CLI are optional local agents.

```bash
git clone <your-clone-url>
cd spec-kit-studio
npm install
npm run dev
```

Before release:

```bash
npm run verify
```

### Local connector

The optional connector is a loopback-only bridge for repository evidence, reviewed writes, and local agents.

```env
STUDIO_ALLOWED_ROOTS="/absolute/path/to/your/repos"
STUDIO_CONNECTOR_TOKEN="use-a-long-random-value"
STUDIO_ALLOWED_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"
```

```bash
npm run connector
```

Use the narrowest parent directory that contains intended repositories—not a home directory. In **Connected Workspace**, scan the repository and record its baseline.

## A safe first feature

1. Scan and baseline the repository.
2. Import and review the feature request.
3. Review impact, design, tasks, and audit findings.
4. Create a linked worktree before implementation. Studio records its branch, path, and baseline commit.
5. Run one approved task and review its evidence.
6. At handoff, export and commit `specs/<feature-slug>/` with the implementation.

## Data, recovery, and providers

Browser state is convenient, not the only durable record. Studio keeps bounded pre-change snapshots; export and commit feature packages for recovery across machines or browser profiles.

- **Export templates only** is the credential-free default.
- **GitHub** uses the existing explicit publication flow.
- **GitLab** emits MR and CI templates without a token or remote write.

Do not put secrets, production data, or credentials in feature text, prompts, or exports. See [Local connector safety](docs/local-connector.md).

## Architecture

```text
React UI → workflow hooks → pure domain libraries → browser project store
                                  ↓
                       typed loopback connector client
                                  ↓
                    path-constrained repository + local agents
```

See [Architecture](docs/architecture.md), [Feature journey](docs/feature-journey-engine-first.md), and [Local connector](docs/local-connector.md).

## Contributing

Keep changes feature-scoped, preserve explicit approval for consequential actions, and add a regression test whenever a workflow rule changes.

```bash
npm run verify
```
