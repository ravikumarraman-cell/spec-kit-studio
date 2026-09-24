# Multi-project and concurrent-feature isolation

This is operational guidance for using the current Studio safely. It is not a claim that Studio can detect every conflict between features.

## Current controls

- A Studio project records optional canonical repository identity, stack profile, delivery-item identity, branch, worktree path, and baseline commit.
- The Feature Registry displays active delivery items, recorded branches, receipts, and declared source-path overlap.
- The connector can create a linked worktree inside `STUDIO_ALLOWED_ROOTS` after explicit confirmation.
- Local-agent implementation requires a registered linked worktree and connector preflight; the main checkout is reported as a warning and the task run requires a linked worktree.
- Feature packages are exported under `specs/<slug>/`. A story package uses the canonical numbered feature directory for its Spec-Kit artifacts and stores Studio-only metadata under `.specify/studio/delivery/<slug>/`.

## Recommended operating model

1. Use one Studio project per repository.
2. Use one delivery item, branch, and linked worktree per independently implemented change.
3. Declare likely source-path overlap and dependencies before implementation.
4. Sequence work that shares migrations, public APIs, lockfiles, IaC state, runtime flags, or release controls.
5. Re-run relevant checks after rebasing or resolving a conflict.
6. Commit the reviewed package and implementation to the feature branch; browser state and ZIP downloads are backup aids, not team history.

## Limits

Path overlap is declared data, not static analysis. Studio does not arbitrate merge conflicts, reserve files, serialize deployments, merge branches, or verify that every runtime dependency is independent. Teams still need repository conventions, code review, CI, and deployment controls.
