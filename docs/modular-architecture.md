# Studio modular architecture

Spec-Kit Studio is a local-first feature-delivery workspace. This guide defines
the boundaries that keep it portable across repositories, local agents, and
technology stacks.

## Module boundaries

| Boundary | Responsibility | Must not own |
| --- | --- | --- |
| `components/journey` | Ordered stages, explicit approvals, and handoffs | Agent-specific command construction or repository writes |
| `components/prompt` | Task selection, local-agent execution UI, review receipts | Git/process implementation details |
| `components/import` | Feature intake and artifact parsing | Shared workspace mutation outside its callback contract |
| `components/workspace` | Repository connection, setup, and baseline status | Feature-specific implementation decisions |
| `components/common` | Stateless, reusable presentation primitives | Feature or connector state |
| `lib/featureJourney` | Pure journey rules, stage readiness, and safe progression | React or browser APIs |
| `lib/connector` | Typed loopback connector client and safe defaults | UI rendering or project persistence |
| `connector/server.mjs` | Local filesystem/process boundary, allowlists, redaction | Browser state or remote persistence |

## Extension rules

1. Add a new local agent by extending the local-agent registry and connector
   command map. Do not fork Prompt Studio.
2. Add a journey stage in `featureJourney.ts`; navigation and stage rendering
   consume that single definition.
3. Add repository capabilities as typed connector endpoints. Enforce path
   confinement, bounds, and output redaction at the connector boundary.
4. Put feature-scoped evidence on the feature inbox receipt, never in global
   workspace state. This prevents a previous feature’s plan or tasks appearing
   as evidence for the current one.
5. Load expensive repository data only after a user intent, such as opening the
   Code changes panel. Keep overview and journey rendering data-light.

## Code-review safety contract

The feature Code changes panel accepts only file paths retained in a reviewed
implementation receipt. The connector verifies that a requested file is
currently changed, rejects traversal paths, excludes Spec-Kit/planning
artifacts by default, bounds text previews, and redacts common credentials.
It is read-only: it cannot stage, commit, push, or execute repository code.

## Refactoring checklist

- Prefer a pure `lib` function for parsing, classification, readiness, or
  policy decisions; cover it with a focused Node test.
- Prefer a component for reusable visual state with a narrow prop contract.
- Keep a screen component as orchestration only. Extract a region once it has
  an independent loading state, a reusable purpose, or more than one action.
- Pass callbacks across feature boundaries instead of importing workspace state
  directly.
- Preserve explicit human approval before any local write, agent execution,
  dependency install, or verification command.
