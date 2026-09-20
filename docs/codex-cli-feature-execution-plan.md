# Codex CLI Feature Execution Plan

## Decision

Use Codex CLI **one approved delivery task at a time**. Do not submit every
task in a feature in one request.

This is the most efficient default for both cost and engineering risk:

- A task-level prompt has one clear objective, a defined requirement boundary,
  and an immediate test target.
- A human can inspect the diff and tests while the feature context is fresh.
- A wrong design direction is discovered after one task—not after an
  expensive, difficult-to-review batch.
- Small, self-contained changes are easier to review, test, merge, and roll
  back. This aligns with [Google's small-change guidance](https://google.github.io/eng-practices/review/developer/small-cls.html)
  and [GitHub's pull-request guidance](https://docs.github.com/en/pull-requests/concepts/helping-others-review-your-changes).

For a normal feature, the recommended unit is one T00x task or one small,
end-to-end vertical slice. Combine tasks only when they touch the same
cohesive code area, the second cannot be tested without the first, they have
one reviewable outcome, and the combined change remains easy to roll back.

Never combine unrelated refactors, infrastructure changes, migrations, or
multiple user journeys merely to reduce clicks.

## What Studio does today

Studio prepares an evidence-grounded implementation contract; it does **not**
silently launch a local coding agent from Prompt Studio.

At Stage 7, **AI Agent Prompts** now:

1. Puts the current imported feature in focus.
2. Shows only that feature's accepted T00x tasks by default.
3. Includes the feature's mapped requirements, accepted architecture plan,
   delivery-plan source, and constitution rules in the Codex prompt.
4. Keeps older shared-workspace tasks behind **Other workspace work** so they
   cannot be selected by accident.
5. Defaults the target-agent profile to **Codex CLI**.

The prompt is a handoff, not a background job. Results currently appear in
the **Codex terminal session**:

- Codex's explanation, commands, and test output appear in its transcript.
- Source changes appear in the target repository's Git diff.
- Studio cannot yet reliably know that an external terminal run succeeded, so
  it must not mark a task complete automatically.

That is intentional: execution evidence should be reviewed before a journey
stage advances.

## Exact workflow for the current feature

Use this for **Tenant AIDE Funding Visibility** and future features alike.

### 1. Start from the feature task, not a generic workspace task

1. In Studio, open **Implement deliberately** → **AI Agent Prompts**.
2. Confirm the **Feature in focus** card names the expected feature.
3. Select the first unchecked T00x task.
4. Leave **Codex CLI** selected.
5. Add a custom note only when it changes scope or verification. Do not repeat
   the requirement or plan; the generated prompt already contains them.
6. Click **Copy Full Prompt**.

If the feature card or T00x list is absent, do not proceed. Return to
**Plan delivery** and make sure a feature-scoped tasks.md was generated and
accepted under specs/feature-slug.

### 2. Run Codex in the target repository

Open a terminal in the repository being changed—not the Studio repository:

    cd /absolute/path/to/your/target-repository
    git status --short
    codex

Paste the copied prompt into Codex and submit it. If it is the first run on
that machine, complete the CLI sign-in flow first.

Before asking Codex to edit, create a recoverable checkpoint when the working
tree is clean:

    git status --short
    git switch -c feature/short-feature-name

If the repository already has uncommitted work, stop and either commit, stash,
or use a separate worktree. Do not mix the feature diff with unrelated work.

Codex CLI is designed for this local loop: inspect a repository, make a
focused change, run local tools, and keep work observable in the terminal.
Its permissions, model, and review controls let the user choose boundaries
for each session. See the [official Codex CLI guide](https://learn.chatgpt.com/docs/codex/cli)
and [official prompting guidance](https://learn.chatgpt.com/docs/prompting).

### 3. Give Codex a bounded first turn

The copied Studio prompt already gives Codex the task contract. Add this
single sentence when you paste it:

> First inspect the relevant files and report the proposed file-level plan.
> Do not edit until I approve that plan.

Approve only if the plan stays within the selected task. Then say:

> Implement the approved plan only. Add or update focused tests. Run the
> smallest relevant verification commands. Show the diff summary and any
> failures; do not commit or push.

This two-turn method reduces wasted implementation tokens when an assumption
is wrong, while preserving one session's repository context.

### 4. Review after every task

After Codex stops:

    git diff --stat
    git diff
    git status --short

Review in this order:

1. Does the diff implement the selected T00x task—and no unrelated task?
2. Does it meet the mapped requirements and constitution rules?
3. Did it add or update a test that would fail without the intended behavior?
4. Did the focused test command pass? If not, is the failure pre-existing and
   documented?
5. Are new dependencies, schema changes, secrets, or network calls justified
   by the accepted plan?

Ask Codex to run its dedicated review command, or ask it to review the
uncommitted diff, before accepting the work. Codex documents dedicated review
as a read-only review surface for uncommitted changes, commits, or a base
branch in the [CLI guide](https://learn.chatgpt.com/docs/codex/cli).

Only then mark the task complete in Studio's feature board and move to the
next T00x task.

## Token-efficient operating rules

| Prefer | Avoid | Why |
|---|---|---|
| One focused task per session | “Implement the entire feature” | Avoids a huge context window, broad diffs, and expensive rework. |
| One planning turn, then an approved editing turn | Repeated speculative edit/revert cycles | Finds a bad file boundary before code is generated. |
| Reuse the same session for one task and its verification | Re-pasting a long prompt after every question | Preserves relevant repository context. |
| Paths, acceptance criteria, exclusions, and verification | Vague requests such as “make it production ready” | Clear context and verification make work more reliable. |
| Focused tests first, then broader checks | Every slow suite after every small change | Keeps cost and wait time proportional to risk. |
| A diff summary and unresolved assumptions | A long narrative explanation | Evidence is more useful and cheaper than prose. |
| Copy Full Prompt | Simulate with Gemini unless an extra opinion is needed | Simulation is a separate model request and does not implement the task. |
| Dependencies and refactors outside task scope | Cleanup bundled with a feature task | Preserves reviewability and rollback. |

Use codex resume only to continue the same bounded task or its immediate
review/fix loop. Start a new session for a new task so stale assumptions do
not carry forward.

## When limited batching is appropriate

Batch **planning or read-only review**, not implementation:

- Review the next two or three task prompts together to identify dependencies.
- Ask Codex to inspect the repository and propose an ordered sequence without
  editing.
- Use the result to adjust the task order in Studio if needed.

Then implement the first task separately.

For independent tasks in separate directories, parallel work is possible only
with isolated Git worktrees and a clear integration owner. It is advanced—not
the default—because merge conflicts and duplicate exploration can consume
more tokens than they save.

## Results and durable evidence

The source of truth after a run is:

| Evidence | Where to look | Purpose |
|---|---|---|
| Agent reasoning and commands | Codex terminal transcript | Explains what was attempted and why. |
| Changed files | Git diff in the target repository | Human review of actual code. |
| Test/build output | Codex transcript and terminal | Confirms the recorded verification result. |
| Feature definition | Feature spec, plan, and tasks files | Shows approved scope and traceability. |
| Stage progress | Studio's Feature Journey | Records human approval state. |

Commit only after the task passes review. A concise commit message should name
the feature and task, for example:

    feat(aide-funding): implement T001 funding-status validation

## Recommended Studio enhancement: explicit local execution

The next product increment should add an optional **Run with Codex locally**
button to Stage 7. It must be an explicit execution flow, never automatic.

### User experience

1. User selects a feature task and sees its prompt preview.
2. User chooses **Run with Codex locally**.
3. Studio displays a confirmation showing the feature, task, repository,
   prompt, workspace-only edit boundary, and Cancel / Start controls.
4. The loopback connector starts one task-scoped Codex session.
5. Studio streams honest progress: investigation, command running, editing,
   verification, completed, or failed. It must not invent percentages.
6. On completion, Studio shows changed files, command results, and a
   read-only diff summary. The user must explicitly mark the task complete.

### Technical boundary

- Invoke Codex with an explicit workspace-write sandbox only after user
  approval. New automation should not use the deprecated full-auto shortcut.
- Capture JSONL progress through the connector, redact secrets, and retain
  only job metadata and user-approved evidence.
- Keep the connector loopback-only and within STUDIO_ALLOWED_ROOTS.
- Never send a connector token, Codex credentials, or repository environment
  variables into the browser.
- Do not auto-commit, push, mark a task done, or advance Stage 7.
- Provide cancel and “agent has stopped” states.

The official non-interactive mode supports streamed JSONL events and explicit
workspace-write sandboxing, making it appropriate for this observable
connector design. It defaults to read-only, so escalation remains deliberate.
See [Codex non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode).

## Definition of success

This workflow is working when a user can answer, at every moment:

1. Which feature am I implementing?
2. Which exact task is Codex allowed to change?
3. Where is Codex running?
4. What did it change and verify?
5. What must I review before the next task?

If any answer is unclear, Studio should show one focused next action rather
than asking the user to infer the workflow.
