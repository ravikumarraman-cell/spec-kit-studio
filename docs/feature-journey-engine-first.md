# Feature Journey

The Feature Journey is Studio's review-oriented delivery workflow for an existing connected repository. It supports either an imported feature or one selected user story. A story may be composed/imported or chosen from the workspace; it does not need to be wrapped in a feature. Studio records stage evidence and requires an explicit approval action to advance; agent output is not approved automatically.

| Stage | Purpose | Review focus |
| --- | --- | --- |
| 1. Connect safely | Establish repository and baseline evidence. | Repository identity, Git state, detected tools, and baseline checks. |
| 2. Describe | Confirm the selected feature or story. | Stories, requirements, acceptance criteria, and boundaries. |
| 3. Ground impact | Record the likely affected surface. | Owners, neighboring behavior, tests, dependencies, and constraints. |
| 4. Design safely | Review a compatible implementation approach. | Components, contracts, data changes, risks, and verification approach. |
| 5. Plan delivery | Turn approved scope into tasks. | Dependencies, mappings, scope, and task-level checks. |
| 6. Quality gate | Review consistency signals. | Traceability issues, missing evidence, and unresolved concerns. |
| 7. Implement deliberately | Execute and review one approved task. | Worktree, changed files, command output, and receipt. |
| 8. Verify and hand off | Leave a durable continuation record. | Verification, remaining work, engine artifacts, delivery evidence, and optional PR record. |

For story-scoped delivery, Studio enforces an additional strict profile before implementation: an installed compatible Spec-Kit CLI, a numbered feature directory, a matching branch, exactly one story in the official specification, and traced official tasks. Those checks validate the artifact contract; they do not validate the resulting application behavior.

The connector requires explicit confirmation before a repository write, worktree creation, command run, installation, coding-agent execution, or remote publication.

## Role, provenance, and imported handoffs

The shared Feature Journey has one **active working role**. A completed
persona handoff is retained as **handoff context**, not as the active person’s
workflow. This distinction survives refresh and prevents a Product Manager,
Business Analyst, Security Researcher, or Architect completion screen from
competing with the active delivery stages.

Studio ZIP imports are validated before they enter the Journey. An accepted
handoff can credit only evidence that the archive proves. For example, a
reviewed Product Manager delivery credits the feature-review stage, but still
requires Connect safely to establish repository baseline evidence; the next
stage is then Ground impact. The user never needs to recreate the accepted
scope merely to move forward.

## Delivery observability

Delivery awareness reports four non-overlapping timing categories:

- **End-to-end elapsed:** clock time since this Feature Journey began.
- **Code-generation runs:** retained start/end timing for reviewed agent task
  receipts; each retained task is displayed separately.
- **Studio workflow actions:** timed generation, scan, retry, and approval
  events. These do not represent the coding agent’s duration.
- **Unattributed elapsed:** the remaining time, which can include reading,
  human review, waiting, and work outside Studio. It is intentionally not
  labeled as human time.

When a legacy/manual receipt lacks agent timestamps, Studio reports that
timing as unavailable rather than estimating it. See [Delivery experience](delivery-experience.md)
for the user-oriented explanation.

## Completed developer handoff

Stage 8 separates three things that should not be conflated:

1. **Engine handoff**: the accepted `spec.md`, `plan.md`, and `tasks.md` in the selected engine's layout. The strict GitHub Spec Kit export contains only engine-owned artifacts.
2. **Delivery evidence**: Studio's manifest, reviewed task receipts, CI/PR template, and—when one was explicitly created—the pull-request record.
3. **Repository code**: the changed application files on the linked feature branch. Code stays in Git rather than being copied into an evidence archive.

After the developer commits and pushes the clean linked-worktree branch, they may expand **Optional: create a GitHub pull request**. Studio uses the existing local GitHub CLI session and asks for a themed confirmation. It checks for a named, clean, pushed branch with commits ahead of the chosen base branch. It does not create a hidden commit, push, merge, or deploy. The resulting URL, number, title, branches, and creation time are retained in the delivery-evidence export.
