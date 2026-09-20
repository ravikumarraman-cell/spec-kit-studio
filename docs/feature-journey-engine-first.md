# Feature Journey: Engine-First Workflow for Existing Repositories

This is the primary experience for adding a bounded feature to an existing repository. It uses the official Spec-Kit workflow in reviewable stages. Studio is the control plane; the selected local agent runs the relevant Spec-Kit Engine stage only after an explicit user action.

## Operating principles

- Treat the repository as evidence. Plans must refer to known code paths, tests, contracts, schemas, or documented conventions.
- Treat the constitution as project governance. Amend it only when a real team rule changes.
- Advance only after a human reviews the stage output. Engine output is never self-approved.
- Keep a pre-existing test failure visible and attributable; do not treat it as caused by the feature.
- Implement only approved tasks. Do not combine planning and implementation into one agent request.

## The eight stages

| Stage | User outcome | Engine activity | Human gate | Studio surface |
|---|---|---|---|---|
| 1. Connect safely | A reviewable baseline is known. | Read-only repository grounding. | Confirm repository, Git state, baseline, and tool readiness. | Connected Workspace |
| 2. Describe the feature | The desired outcome and compatibility boundaries are clear. | `speckit.specify` | Approve user stories, requirements, success measures, and must-not-break behavior. | Feature import / Feature Spec |
| 3. Ground the impact map | The change has an evidenced blast radius. | Read-only investigation; `speckit.constitution` only if governance changes. | Confirm owning paths, neighboring behavior, tests, contracts, and guardrails. | Constitution Rules + repository evidence |
| 4. Design safely | A compatible design is ready. | `speckit.plan`, then `speckit.checklist` when appropriate. | Approve components, contracts, schema changes, ADRs, test strategy, and rollback considerations. | Architecture Plan |
| 5. Make delivery actionable | Work is dependency-ordered and traceable. | `speckit.tasks`, then `speckit.analyze`. | Approve phases, dependencies, requirement mappings, and unresolved findings. | Phased Task Board |
| 6. Pass the quality gate | Artifacts are internally consistent. | `speckit.analyze` | Resolve meaningful cross-artifact gaps or explicitly return to the owning stage. | Spec Quality Audit |
| 7. Implement deliberately | One approved task or phase is completed safely. | `speckit.implement` | Review changed files, focused checks, and task completion before continuing. | AI Agent Prompts |
| 8. Verify and hand off | The change is reviewable and durable. | `speckit.converge` | Review remaining work, verification results, Git diff, and exported artifacts. | CLI & Repo Exporter |

## Stage ownership and loops

When a quality gate finds a problem, return to the owner rather than patching around it:

- Unclear behavior or compatibility boundary → Stage 2.
- Missing repository rule or violated guardrail → Stage 3.
- API, data, component, test, or rollback design gap → Stage 4.
- Missing mapping, dependency, or implementation task → Stage 5.
- Code behavior diverges from the approved artifacts → Stage 7, then re-run Stage 8.

## What Studio must not do

- Do not claim “zero hallucinations.” Prefer “evidence-grounded and reviewable.”
- Do not run `constitution → specify → plan → tasks → implement` in one opaque agent job.
- Do not silently write repository files, commit, push, or self-approve checklists.
- Do not require a user to infer the next sidebar module. The Feature Journey always exposes one primary next action.
