# Story-first delivery: implementation status

This document records the delivered story-first capability and separates it from ideas that are not product commitments.

## Implemented

- Intake can begin with a feature (the default) or one user story. A story can be entered/imported or selected from the existing workspace.
- A story journey is a durable delivery item with `scope: 'user-story'`, one `primaryStoryId`, one owned story ID, mapped requirement IDs, and optional parent-feature provenance.
- Existing records with no scope continue to resolve as feature items.
- UI actions are available from story cards, quick search, overview, and the delivery intake dialog.
- Story scope is shown in the journey and passed into planning, task, prompt, receipt, and export behavior.
- Story packages keep the selected story and its mapped requirements out of sibling artifacts.
- Story export uses schema version 2 metadata, canonical `specs/NNN-feature-name/` Spec-Kit core artifacts, and Studio-only delivery metadata beneath `.specify/studio/delivery/NNN-feature-name/`.
- Story conformance checks require the numbered identity, one official user story, mandatory headings, no unresolved official placeholders/clarifications, and traced `T001` / `[US1]` tasks with file paths.
- Connector preflight requires an initialized `.specify/` directory and Spec-Kit 1.0.11 or newer for strict story implementation.

## Deliberate limits

- Feature-first remains the default; story-first does not split an entire feature into independent journeys automatically.
- A scope or conformance check is not evidence that the resulting code is correct.
- Studio does not automatically commit, push, create a pull request, or deploy.
- Workspace data is browser-local. Exported and committed artifacts are the durable cross-machine record.
- Existing project-wide feature data remains available as context. Story readiness and package generation use the selected story item; reviewers should still inspect any related cross-cutting work.

## Future ideas, not current promises

The repository contains no product commitment for automatic duplicate-story conflict resolution, remote collaboration, automatic story decomposition, automatic deployment, or a replacement of browser storage with a hosted database. Such work requires its own approved scope and implementation.

