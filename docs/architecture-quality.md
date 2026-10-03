# Architecture and usability guardrails

Studio is organized around explicit boundaries so new personas, engines, and workflows can be added without editing unrelated screens.

- `src/lib/` holds deterministic domain policies, validation, persistence adapters, and connector clients. It must not invoke browser UI APIs.
- `src/components/common/` contains reusable interaction primitives: themed confirmation, errors, disclosures, headers, loading states, and engine-contract labels.
- `src/components/personas/` contains role-specific evidence forms built on shared lifecycle, reviewed-input, draft-action, and engine-projection contracts.
- `src/lib/personas/registry.ts`, `catalog.ts`, and `consumption.ts` are the extension points for a new persona. Register its metadata, adapter, and declared read-only input rules; do not copy routing logic into screens.
- `src/lib/sddEngineWorkflow.ts` is the extension point for an SDD engine. The engine must supply a versioned validator before Studio can accept or export its artifacts.
- `src/lib/deploymentBoundary.ts` and `DeploymentBoundaryBanner` expose one safe, server-derived deployment context in the application shell. Regulated labels belong there, not in every persona or stage screen.

UX guardrails:

1. Show one primary next action; supporting detail is progressively disclosed.
2. Keep the active persona and selected engine visible across the delivery path.
3. Every draft has adjacent accept and discard actions; no user has to navigate away to recover.
4. Use Studio’s themed confirmation and error components—never native browser dialogs.
5. Treat upstream persona artifacts as read-only, accepted, feature-scoped context.
6. Every consequential workflow CTA uses the shared `ActionBrief`: an
   always-visible one-line outcome and a click/tap/keyboard disclosure for
   creates, inputs, safeguards, and the next decision. Do not hide required
   action instructions in a tooltip. Simple navigation and local table controls
   remain direct so this pattern does not become visual noise.
7. A provider publication action must be optional, explicitly confirmed, and
   represented in delivery evidence. It must never hide a commit, branch push,
   merge, or deployment behind a Studio action.

Automated checks cover TypeScript, responsive layouts, native-dialog prevention, persona-consumption registration, artifact conformance, and workflow transitions. Large orchestration screens remain deliberately composed from domain helpers and shared subcomponents; additions should extract a focused component or hook before adding a second copy of a pattern.
