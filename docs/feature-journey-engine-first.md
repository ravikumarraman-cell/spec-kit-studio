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
| 8. Verify and hand off | Leave a durable continuation record. | Verification, remaining work, and exported artifacts. |

For story-scoped delivery, Studio enforces an additional strict profile before implementation: an installed compatible Spec-Kit CLI, a numbered feature directory, a matching branch, exactly one story in the official specification, and traced official tasks. Those checks validate the artifact contract; they do not validate the resulting application behavior.

The connector requires explicit confirmation before a repository write, worktree creation, command run, installation, or coding-agent execution. Studio does not automatically commit, push, create pull requests, or deploy.
