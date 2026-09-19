# Evaluation: Adding Features to an Existing Project

The workflow in `adding_features_to_existing.md` is a sound planning discipline, and it can be followed for adding a feature to an existing repository. Treat Spec-Kit Studio as the specification workspace, then validate its output against the actual codebase before implementation.

## Step-by-step assessment

### Step 1: Import and align the existing codebase

This needs a small correction. Studio does not currently accept a local filesystem path. It supports:

- A public GitHub repository URL
- Pasted manifest, source, or file-tree content
- A previously exported Spec-Kit ZIP or JSON package

The repository analysis is AI-assisted using the context supplied to it; it is not a complete scan of a local codebase. For a private or local repository, provide the relevant manifests, directory tree, and key implementation files, or use a working copy directly during implementation.

### Steps 2–4: Feature specification, architecture plan, and phased tasks

These steps are solid and actionable. Define requirements, user stories, acceptance criteria, edge cases, API/data contracts, ADRs, and tasks mapped to requirements.

Add the currently omitted **Constitution Rules** step before prompt generation. This is where project-specific coding conventions, testing requirements, security constraints, and architectural invariants should be recorded.

### Step 5: Spec quality audit

The audit is useful as a review signal, but its score is AI-generated. A target such as 95% should not be treated as a release gate by itself. Review the identified gaps and validate the plan against the repository and the feature's acceptance criteria.

### Step 6: AI coding prompts

The prompts provide useful context and improve grounding. However, “zero hallucinations” is not a realistic guarantee. The implementation agent should be instructed to:

- Inspect the relevant repository files before changing code.
- Use only verified APIs and existing project conventions.
- Run the applicable tests, type checks, and build.
- Report ambiguities or missing requirements rather than inventing behavior.

### Step 7: Export and local synchronization

This step is not accurate for the current implementation. The app downloads a ZIP containing:

- `spec.md`
- `plan.md`
- `tasks.md`
- `constitution.md`
- Prompt assets and `specify.sh`

It does not use `curl -s https://specify.sh | bash`, and it does not automatically synchronize files into a target repository. Download the ZIP, inspect it, and intentionally copy the desired specification assets into the feature branch.

The importer also primarily preserves imported Markdown as raw content; it does not fully rehydrate every exported field into the structured editors. For a new feature, create or edit the specification directly in Studio before export.

### Step 8: Version control

This step makes sense with one change: commit only the generated specification files and implementation files intended for the feature. Do not blindly stage `src/` or push directly to `main`. Prefer a feature branch and normal review process.

## Inputs needed to begin

1. Target repository path or GitHub URL.
2. A concise feature goal: who needs it, what changes, and why.
3. Non-negotiables: timeline, supported environments, security/compliance needs, and services or dependencies that may or may not be introduced.
4. Preferred Git approach: branch name and whether implementation should proceed after the planning and audit steps.

## Recommended workflow

1. Supply repository context and a feature goal.
2. Create the feature spec, architecture plan, task breakdown, and constitution rules.
3. Review the audit findings and resolve material gaps.
4. Generate a task-scoped coding prompt.
5. Implement in the target repository while verifying assumptions against its actual code.
6. Export the final documentation assets and commit them with the implementation on a feature branch.
