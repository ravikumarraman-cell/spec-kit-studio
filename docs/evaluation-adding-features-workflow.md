# Evaluation: adding features to an existing project

## Current assessment

Studio can support a disciplined delivery workflow when it is paired with repository evidence and human review. It should not be used as a substitute for inspecting code, running repository verification, or reviewing a pull request.

The connector can scan an allowed local repository and report Git and manifest evidence. A pasted URL or issue text alone is not repository introspection.

## What the product provides

- Feature-first intake and story-first intake for a single user story.
- Structured specification, planning, task, constitution, audit, prompt, and handoff surfaces.
- Feature/item identities, scoped package export, receipts, and recovery snapshots.
- Optional local worktree creation, command execution, and agent launch behind explicit confirmations.
- Strict official-artifact checks for story-scoped implementation.

## What remains a reviewer responsibility

- Decide whether imported text reflects the desired behavior.
- Verify that generated requirements, impact analysis, and tasks are complete and correct.
- Choose and run the relevant repository checks, including any security, migration, infrastructure, or end-to-end validation.
- Review the code diff and decide when a task is complete.
- Commit, push, open a pull request, and deploy through the repository's normal process.

## Recommended use

1. Scan the target repository and record a baseline.
2. Create a narrowly scoped feature or user-story delivery item.
3. Review artifacts at every journey gate; treat AI output as a draft.
4. Implement one approved task in a linked worktree.
5. Review its receipt and repository verification.
6. Export and commit the final artifacts with the implementation.
