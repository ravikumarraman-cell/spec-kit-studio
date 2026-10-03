# Engine deliverable contract

Spec-Kit Studio separates a Studio companion from an engine artifact. A companion can preserve persona notes, audit receipts, or UX metadata. An engine artifact is the exact file that an SDD engine consumes.

Every deliverable follows one reusable path:

1. A persona, Journey stage, connector, or importer creates its own rich Studio companion.
2. Its adapter projects the companion into a feature-scoped engine artifact (`spec`, `plan`, or `tasks`).
3. `validateSddEngineArtifacts` validates that projection against the selected engine before acceptance or export.
4. Export fails closed when any required engine artifact is absent or invalid. Studio-only metadata stays under `.specify/studio/` and is never represented as engine input. This includes reviewed task receipts and optional pull-request records.

GitHub Spec Kit is the only available engine adapter. It requires the official numbered `specs/NNN-feature/{spec,plan,tasks}.md` layout, `.specify/feature.json` pointing at the selected feature, and the template structures enforced in `src/lib/specKitCompliance.ts`. Its pinned Studio contract is `v1.0.6`.

Future engine adapters implement the same validator boundary in `src/lib/sddEngineWorkflow.ts`. They do not require changes to persona screens, export callers, or acceptance flow. An engine remains unavailable until it provides a verified artifact schema, validator, and export layout.

This gives Studio a precise validation boundary: acceptance and export run the
checks implemented by the selected, pinned engine adapter. For GitHub Spec
Kit, those checks cover Studio's supported numbered layout and template
structure. They do not prove that a later engine release, an unmodeled engine
rule, or a downstream repository command will accept the artifact. Studio does
not claim that companion evidence is native engine input, and it does not
silently downgrade an unavailable adapter.
