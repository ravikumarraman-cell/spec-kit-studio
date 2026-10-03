# Delivery Workflow

Studio uses one reviewable journey with two equal starting scopes:

| Start with | Use it when | Studio keeps in scope |
| --- | --- | --- |
| **Feature** | The request contains related stories or a larger capability. | The feature, linked stories, requirements, tasks, and reviewed artifacts. |
| **User story** | One outcome can be delivered independently. | One story, selected requirements, its artifacts, receipts, worktree, and handoff. |

A story does not need to be wrapped in a feature first.

## Eight review stages

1. **Connect** — bind and scan the repository; inspect Git and stack evidence.
2. **Describe** — capture or import the bounded outcome and acceptance criteria.
3. **Impact** — identify affected capabilities, dependencies, and risks.
4. **Design** — review architecture choices, contracts, schemas, and decisions.
5. **Tasks** — order implementation work and retain requirement traceability.
6. **Audit** — surface structural gaps and optional AI review candidates.
7. **Implement** — execute approved work in a registered linked worktree.
8. **Handoff** — separate engine artifacts, Studio evidence, and repository code; retain checks, changed files, receipts, and repository-relative artifacts.

## What makes the journey reviewable

- Generated content remains a candidate until a person reviews it.
- Connector writes and agent execution require explicit confirmation.
- Each implementation run is tied to an approved task and worktree.
- Failed checks retain enough context for a repair decision.
- Exported packages preserve source mappings and bounded scope.
- A developer may explicitly create a GitHub PR only after committing and
  pushing a clean linked-worktree branch. Studio records the PR in delivery
  evidence; it never commits, pushes, merges, or deploys.

## Focused workflows

Studio also provides independent **Bug Fix** and **Idea Assessment** flows. Their evidence packages do not silently mutate the main Feature Journey.

## Deep dives

- [Eight-stage feature journey](https://github.com/rraviku2_uhg/spec-kit-studio/blob/main/docs/feature-journey-engine-first.md)
- [Add features to an existing repository](https://github.com/rraviku2_uhg/spec-kit-studio/blob/main/docs/adding_features_to_existing.md)
- [Feature isolation](https://github.com/rraviku2_uhg/spec-kit-studio/blob/main/docs/feature-isolation-user-guide.md)
- [Outcome Refinery](https://github.com/rraviku2_uhg/spec-kit-studio/blob/main/docs/outcome-refinery.md)

---

[Project site](https://rraviku2-uhg.github.io/spec-kit-studio/#workflow) · [[Home]] · [[Getting Started]] · [[Architecture]]
