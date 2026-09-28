# TenantCompass recommendation archive

This document previously mixed a hypothetical TenantCompass operating model with time-sensitive claims about Studio. That made the claims easy to misread as a current product description, so the detailed recommendation has been retired.

## Current, factual guidance

Use Studio as an evidence-and-review workspace, not as an authoritative source of repository facts. For a feature in any repository:

1. Connect and scan the local repository through the optional connector.
2. Supply the issue or request as untrusted product input; inspect source paths, tests, contracts, and repository instructions separately.
3. Start a feature or one user-story delivery item and review its acceptance criteria and boundaries.
4. Use impact, design, tasks, and audit as review aids. An AI-generated score is not release approval.
5. Implement only approved tasks in a linked worktree, then inspect the diff and run applicable repository checks.
6. Commit, open a pull request, and deploy through the repository's normal controls.

Studio can create worktrees, run selected local-agent tasks, and export scoped artifacts after explicit confirmation. It does not automatically commit, push, open pull requests, or deploy. It also cannot prove the correctness, security, license provenance, or production readiness of a change.

Repository-specific instructions should live with that repository or its team documentation, where their owners can keep them current.
