# Codex CLI feature execution

## Current behavior

Studio can launch Codex through the optional local connector after the user explicitly confirms a task run. The connector invokes Codex in the registered linked worktree with a workspace-write sandbox and a task-scoped prompt. It records bounded job output and offers read-only review of retained changed files.

Studio does not automatically treat a clean Codex exit as task completion. A reviewer must inspect the result, retain the receipt, and approve subsequent workflow progress.

## Safe operating sequence

1. Connect the repository and review its baseline.
2. Accept the selected delivery item's scope, plan, and task list.
3. Create a linked worktree and confirm its branch/path match the delivery item.
4. Select one task and review the generated prompt.
5. Explicitly start Codex.
6. Inspect the changed files and focused verification output.
7. Record the result only after review; commit through normal Git workflow when ready.

## Constraints

The connector refuses local-agent implementation without its explicit confirmation, a registered linked worktree, and successful preflight. For story delivery it additionally requires the strict Spec-Kit artifact contract. It does not commit, push, create pull requests, or deploy.

The prompt is context, not a correctness guarantee. The person reviewing the change remains responsible for scope, tests, security, and release decisions.
