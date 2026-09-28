# Feature isolation user guide

This is the practical companion to the [multi-project operating model](multi-project-feature-isolation-operating-model.md).

## Start a project

Create one Studio project for one repository. In **Connected Workspace**, scan the repository to bind its canonical Git remote and collect technology evidence. Choose a stack profile in **Settings**; it adds safe default checks and prohibited paths to task contracts.

## Start a feature

Import the request. Studio assigns a feature key and slug. The slug owns:

```text
specs/<feature-slug>/
```

The portable package contains a manifest, scoped spec, impact map, plan, tasks, receipts, and CI/PR handoff template.

## Implement safely

Before implementation, create a linked worktree from the active-feature panel in a new empty directory inside `STUDIO_ALLOWED_ROOTS`. Studio creates `feat/<feature-slug>` and records its path, branch, and baseline commit. Implementation is blocked in the main checkout.

Declare source roots for features running at the same time. The Feature Registry reports only explicit path overlap. Pause and record a dependency if work shares a migration, public API, lockfile, IaC state, or runtime flag.

## Handoff and history

Stage 8 does not remove earlier evidence. Reopen the Feature Journey or Feature Registry to view retained stage evidence. Export and commit `specs/<feature-slug>/` with implementation before closing the feature. Browser snapshots help recovery; Git is the durable team record.

## Provider options

| Option | Remote writes |
| --- | --- |
| Export templates only | None |
| GitHub | Explicitly confirmed only |
| GitLab | None; generates MR/CI templates |

Never store provider tokens in a feature package.
