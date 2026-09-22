# Multi-Project and Concurrent-Feature Isolation Operating Model

**Status:** proposed operating standard  
**Audience:** Spec-Kit Studio operators, repository maintainers, and platform teams  
**Last reviewed:** 2026-09-21  
**Scope:** using one Studio installation with many repositories, technology stacks, and concurrently active features.

## Executive decision

Treat a **Studio project** as a durable record for exactly one repository and one technology/governance profile. Treat a **Studio feature** as a bounded change within that project. Treat a **Git worktree and branch** as the only permitted execution location for that feature.

Never use one Studio project as a general-purpose bucket for unrelated repositories. Never run an implementation agent in a repository's default checkout while another feature is active there. Never allow a feature to use a shared `plan.md` or `tasks.md` as its authoritative artifact.

The resulting isolation boundary is:

```text
Studio project ── 1:1 ── repository identity ── 1:1 ── stack + constitution
       │
       └── feature record ── 1:1 ── feature slug ── 1:1 ── Git branch + worktree
                                      │
                                      └── specs/<feature-slug>/{spec,plan,tasks}.md
```

This is intentionally redundant. A mistaken selection in one layer must be caught by the others before it can alter code or overwrite planning evidence.

## Why this is necessary

Today, Studio stores its project aggregate in browser `localStorage` (`speckit_studio_projects_v1`). It keeps the current feature's impact map, accepted architecture plan, delivery plan, and implementation receipts in `featureInbox`; it also has project-wide structured `spec`, `plan`, and `tasks` fields. The latter are useful for editing and summaries, but are not a safe source of truth for multiple concurrent features because they are shared by the project.

The local connector already provides important safeguards: it is loopback-only, restricts repositories to `STUDIO_ALLOWED_ROOTS`, requires explicit confirmations for writes/agents, and serializes active jobs **per repository path**. These are good foundations, but a path alone is not enough isolation when two features use the same checkout, and browser storage alone is not a durable record.

## Design principles and research basis

| Principle | Decision in this model | Evidence |
| --- | --- | --- |
| Separate independent working copies | One branch + one Git worktree for every active feature. | Git documents linked worktrees as separate working trees with their own `HEAD` and index, enabling multiple branches to be checked out concurrently. [Git worktree documentation](https://git-scm.com/docs/git-worktree) |
| Preserve an auditable chain of evidence | Commit the feature contract, reviews, receipts, and code together; record the baseline commit and artifact hashes. | NIST SSDF calls for practices that reduce vulnerabilities and improve traceability across the SDLC. [NIST SP 800-218](https://csrc.nist.gov/pubs/sp/800/218/final) |
| Require independent merge gates | Protected default branches, PR review, required checks, and code-owner review for owned paths. | GitHub supports required reviews, status checks, code-owner approval, signed commits, and no-bypass rules. [GitHub protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches) |
| Serialize only conflicting delivery operations | Use CI concurrency by repository/environment; do not unnecessarily serialize unrelated features. | GitHub concurrency limits a group to one running workflow/job; environments add approval and secret protections. [GitHub deployments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/control-deployments) |
| Keep browser data non-sensitive and backed up | No tokens, credentials, or production data in project artifacts; export and commit handoffs. | OWASP warns that any XSS can read or alter `localStorage`, and advises against storing sensitive information there. [OWASP HTML5 Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html) |
| Make partial releases reversible | Use short-lived release flags only where needed, with owner and removal date. | Feature flags separate deployment from release but add carrying and test costs; stale flags should be removed. [Feature Toggles](https://martinfowler.com/articles/feature-toggles.html) |
| Make builds attributable | Preserve build/test evidence tied to immutable source and artifact versions. | SLSA defines provenance as verifiable information linking an artifact to its source and build process. [SLSA provenance](https://slsa.dev/spec/v1.2/provenance) |

## Canonical naming and identity scheme

Every identifier is assigned before Stage 1 and is immutable after Stage 2 approval.

| Field | Format | Example | Rule |
| --- | --- | --- | --- |
| Portfolio key | lowercase slug | `tenant-compass` | Stable business/product name. |
| Repository key | `org/repo` plus Git remote URL | `acme/cloud-asset-inventory` | Must match `origin` after normalization. |
| Studio project ID | generated UUID or `proj-<repo-key>` | `proj-cloud-asset-inventory` | One active Studio project per repository identity. |
| Stack profile ID | `<repo-key>@<major>` | `cloud-asset-inventory@2` | Changes only when its approved stack/constitution changes. |
| Feature key | tracker ID preferred | `CAI-142` | Never reuse. If there is no tracker, use `FEAT-YYYY-NNN`. |
| Feature slug | `<feature-key>-<short-kebab-title>` | `cai-142-export-inventory-csv` | Generated once; lower case; no spaces. |
| Branch | `feat/<feature-slug>` | `feat/cai-142-export-inventory-csv` | One open feature per branch. |
| Worktree directory | `<worktree-root>/<repo-key>/<feature-slug>` | `~/studio-worktrees/cloud-asset-inventory/cai-142-export-inventory-csv` | Never nest inside the repository. |
| Artifact root | `specs/<feature-slug>/` | `specs/cai-142-export-inventory-csv/` | Only that feature may write here. |
| Prompt/task ID | `<feature-key>-TNNN` | `CAI-142-T003` | No project-global `TASK-101` reuse. |

The feature key must appear in:

- the Studio feature title and record;
- the branch and worktree names;
- the directory under `specs/`;
- every requirement/task identifier;
- the pull request title; and
- the exported handoff manifest.

This makes accidental cross-feature attachment obvious in a UI, terminal, diff, or pull request.

## Repository and technology profiles

Create a separate Studio project for every repository, even where repositories belong to the same product. A frontend React repository, Python service, Terraform repository, and data pipeline are different projects because their test commands, dependency management, security controls, owners, and release paths differ.

At project creation, establish a versioned profile committed to the repository:

```text
specs/_project/
  studio-project.yaml          # immutable repository identity + approved roots
  stack-profile.md             # languages, package managers, build/test commands
  constitution.md              # engineering and governance rules
  ownership.md                 # CODEOWNERS links and escalation contacts
  environments.md              # dev/stage/prod and deployment rules
```

`studio-project.yaml` should contain at least:

```yaml
schemaVersion: 1
studioProjectId: proj-cloud-asset-inventory
portfolioKey: tenant-compass
repository:
  canonicalRemote: git@github.com:acme/cloud-asset-inventory.git
  defaultBranch: main
stackProfile: cloud-asset-inventory@2
allowedArtifactRoot: specs
allowedSourceRoots:
  - frontend/src
  - services/inventory
  - infrastructure
requiredChecks:
  - lint
  - unit
  - integration
  - security
```

The connector must compare the scanned remote and the checked-out branch to this profile before an agent or apply operation. A mismatch is a hard stop, not a warning.

### Stack-specific execution contracts

Do not use a universal prompt such as “write TypeScript.” Each stack profile supplies an execution contract.

| Stack type | Contract must name | Isolation-specific rule |
| --- | --- | --- |
| Node/React | Node/package-manager version, lockfile, lint/typecheck/unit/e2e commands, dev port | Allocate a feature-specific port and separate `.env.local`; never share a running dev server. |
| Python | Python version, virtualenv/tool, formatter/linter/test command, migration command | One virtualenv/cache namespace per worktree or tool-managed project; never run migrations against shared development data by default. |
| Java/.NET/Go/Rust | toolchain version, test/build package, artifact registry | Keep generated artifacts/cache outside the source worktree or under ignored paths. |
| Terraform/IaC | provider versions, backend, workspace/environment, plan/apply policy | `plan` is read-only evidence; `apply` requires a separately approved environment and a feature-specific state/workspace policy. |
| Database migrations | engine/version, migration tool, rollback, fixture/database name | Use disposable schema/database names such as `studio_<feature-key>`; production migrations never run from Studio’s implementation stage. |
| Data/ML | dataset classification, snapshot/version, pipeline runner, evaluation metric | Store only dataset references and hashes in artifacts; never copy sensitive data into Studio or prompts. |

## The non-interference controls

Each control catches a different class of mistake. All are required for concurrent work.

| Boundary | Required control | What it prevents |
| --- | --- | --- |
| Portfolio | separate project registry entry per repository | one app's constitution or stack being applied to another |
| Browser state | project ID, repository fingerprint, feature key, exported backup | ambiguous selection and loss of local-only data |
| Filesystem | one worktree per active feature | agents editing another feature's uncommitted files |
| Git | one branch/PR per feature, protected default branch | unreviewed or co-mingled changes landing together |
| Artifacts | `specs/<feature-slug>/` with manifest and hashes | a new plan/tasks file replacing an existing feature's contract |
| Requirements/tasks | feature-prefixed, globally unique IDs | traceability collisions |
| Local agent | worktree path + feature slug in every command | an agent using the parent/default checkout |
| CI | run/lock scopes based on repository and environment | competing deploys and confusing results |
| Runtime | feature flag and isolated test data when necessary | partially built feature affecting users or another test |
| Credentials | environment-scoped secret references only | one project/environment credential leaking into another |

## Required feature package

Every feature owns one directory, committed on its branch before implementation begins:

```text
specs/cai-142-export-inventory-csv/
  manifest.yaml
  spec.md
  impact-map.md
  plan.md
  tasks.md
  audit.md
  implementation-receipts/
    CAI-142-T001.json
    CAI-142-T002.json
  handoff.md
  checksums.sha256
```

`manifest.yaml` is the anchor. It must include:

```yaml
schemaVersion: 1
featureKey: CAI-142
slug: cai-142-export-inventory-csv
studioProjectId: proj-cloud-asset-inventory
canonicalRemote: git@github.com:acme/cloud-asset-inventory.git
branch: feat/cai-142-export-inventory-csv
baselineCommit: <full-40-character-sha>
stackProfile: cloud-asset-inventory@2
status: active # draft | planned | implementing | verifying | handed-off | archived
owners: [team-inventory]
dependencies: []
conflictsWith: []
artifactPaths:
  spec: specs/cai-142-export-inventory-csv/spec.md
  plan: specs/cai-142-export-inventory-csv/plan.md
  tasks: specs/cai-142-export-inventory-csv/tasks.md
```

The manifest is immutable in the identity fields after Stage 2. A changed `baselineCommit` is permitted only through an explicit rebase/revalidation record; changing the remote, feature key, or slug requires a new feature package.

## Fool-proof operating procedure

### A. One-time portfolio setup

1. Create a `Studio Project Registry` outside browser storage (a private Git repository is sufficient initially). It lists each canonical remote, Studio project ID, stack profile, default branch, artifact root, owners, and last backup/validation time.
2. Create one Studio project for every registry repository. Do not import a second repository into an existing project.
3. Connect the Studio local connector only to approved parent directories using `STUDIO_ALLOWED_ROOTS`. Keep the connector process per machine/user; never expose it on a network interface.
4. Commit `specs/_project/` in each repository and protect it with CODEOWNERS/platform review.
5. Configure branch protection on the default branch: PR required, required checks, required owner reviews for sensitive paths, conversation resolution, and no direct pushes/bypass where organizational policy permits.
6. Configure CI environments (`development`, `staging`, `production`) with separate secrets, reviewers, and explicit concurrency groups such as `<repo>-production`.
7. Export all Studio projects as JSON after setup and store the encrypted backup in approved team storage. Repeat at least weekly and after any completed handoff.

### B. Start a feature safely

1. Reserve a feature key in the work tracker. Check the registry and open PRs for duplicate or overlapping work.
2. Create its branch and linked worktree from an up-to-date default branch. Example:

   ```bash
   git fetch origin
   git worktree add -b feat/cai-142-export-inventory-csv \
     ../studio-worktrees/cloud-asset-inventory/cai-142-export-inventory-csv \
     origin/main
   ```

3. In that worktree, create and commit the minimal feature package with `manifest.yaml` and `spec.md`. Do not use the shared `.specify/studio/plan.md` or `.specify/studio/tasks.md` as the feature authority.
4. Create or select the corresponding Studio feature record. Its title begins with the feature key; record the worktree path, branch, baseline SHA, and feature slug.
5. Run Stage 1 against the **worktree path**, not the default repository checkout. The connector must verify: canonical remote, exact branch, clean worktree (except the known feature package), baseline SHA ancestry, and profile-compatible tools.
6. If any validation fails, stop. Do not “continue anyway,” point Studio at another folder, or manually change identity fields.

### C. Run Stages 2–6 without cross-feature edits

1. Stage 2 writes only `specs/<feature-slug>/spec.md`; requirements use the feature key, for example `FR-CAI-142-001`.
2. Stage 3 writes only `impact-map.md`, including affected paths and conflicts with other open features.
3. Stage 4 writes only `plan.md`; it includes approved source roots, prohibited paths, migration/testing/rollback plan, and a dependency statement.
4. Stage 5 writes only `tasks.md`; task IDs are `CAI-142-T001` etc. Every task has an explicit allowed-path list.
5. Stage 6 writes `audit.md` and updates the manifest only with audit status/hash. It must check uniqueness of all IDs, artifact paths, and branch/worktree association.
6. Before approving each stage, commit the artifact. Studio may retain a convenient copy, but Git is the durable and reviewable source of truth.

### D. Implement one bounded task safely

1. Only start a local agent when the active Studio project, selected feature, scanned worktree, manifest remote, branch, and feature slug all match.
2. Pass the task ID, worktree path, approved source roots, prohibited paths, test commands, and artifact paths into the prompt. Require the agent to stop after the selected task.
3. Keep the connector’s one-active-job-per-worktree lock. Do **not** lock the whole repository: separate worktrees may work concurrently. Add a second lock by `featureKey` to block two agents on one feature.
4. Block automatic commit, push, migration apply, production deployment, credential creation, and deletion outside the feature-owned paths. These stay human-controlled.
5. After each task, capture changed files, diff stat, commands, exit codes, test results, and the commit SHA in `implementation-receipts/<task-id>.json`. Link the same evidence in Studio’s feature receipt.
6. If the task touches a file claimed by another open feature, pause both features. Resolve through an integration decision: sequence the work, extract a prerequisite PR, or designate a single owner. Never let both branches independently edit a shared contract/migration/lockfile without an explicit integration plan.

### E. Verify, hand off, and merge

1. Rebase or merge the latest default branch according to repository policy. Re-run Stage 6 audit after a material rebase.
2. Run required checks from the stack profile plus feature acceptance checks. For a flag, test both flag-off (existing behavior) and flag-on behavior.
3. Produce `handoff.md` with baseline SHA, final SHA, changed paths, test commands/results, migration/rollback status, feature-flag owner/expiry, unresolved risk, and links to the PR/deployment.
4. Export Studio’s project JSON and final ZIP as a secondary backup. Commit the **feature package** to the PR; do not rely on the ZIP alone because Studio’s current ZIP is primarily project-wide.
5. Merge only through the protected PR. CI deployment is serialized by environment, not by all feature branches. Archive the feature record only after merge and verification complete.
6. Remove the worktree safely only after its branch/PR evidence is retained and the worktree is clean: `git worktree remove <path>`. Never delete a directory manually while it is registered as a worktree.

## Concurrent-feature decision matrix

| Situation | Can work proceed concurrently? | Required action |
| --- | --- | --- |
| Different repositories, different stacks | Yes | Separate Studio projects, stack profiles, connector-approved roots, branches, worktrees, and CI groups. |
| Same repository, disjoint source areas | Yes | Separate worktrees/packages; document owned paths in both impact maps; separate PRs. |
| Same repository, same shared API/schema/interface | Not independently | Create a prerequisite/shared-contract feature or sequence one feature after the other. |
| Same repository, same database migration sequence | Usually no | One migration owner and ordered PRs; test against disposable databases; record dependency. |
| Same repository, same lockfile/dependency upgrade | Only with coordination | Prefer a dedicated dependency/prerequisite PR; otherwise serialize changes. |
| Same repository, same runtime flag | No | One flag owner; either combine into one delivery feature or use distinct flags. |
| Different repositories but shared deployed environment | Planning: yes; deploy: no | Independent feature work, environment-scoped CI concurrency and approvals. |
| Emergency fix while another feature is incomplete | Yes | New hotfix branch/worktree from production/default branch; do not stash or mutate the feature worktree. |

## What must change in Spec-Kit Studio

The following is the implementation plan that turns this model into product-enforced behavior. Until phases 1–2 are delivered, follow the operating procedure manually and treat Studio’s project-wide editors as convenience views only.

### Phase 1 — identity and storage safety (highest priority)

1. Replace display-derived IDs with UUIDs plus immutable `RepositoryIdentity` and `FeatureIdentity` objects in `src/types/speckit.ts`.
2. Add `repositoryFingerprint` (normalized remote URL, default branch, and optional repository ID) and `stackProfile` to `SpecKitProject`.
3. Add `featureKey`, `slug`, `branch`, `worktreePath`, `baselineCommit`, `status`, `allowedSourceRoots`, and `prohibitedPaths` to `FeatureInboxItem`.
4. Migrate browser state to versioned records and validate all persisted data at load. Back up before schema migration; retain migration logs.
5. Add a visible project/feature identity banner on every page and a persistent “wrong worktree” stop state.
6. Add explicit JSON export/import per project and per feature, with schema version and SHA-256 checksum. Do not place secrets in either export.
7. Make the default export feature-scoped: export exactly `specs/<feature-slug>/`, manifest, receipts, and prompts. Retain the legacy project ZIP as an explicit “workspace summary” export.

**Acceptance test:** a feature from Repo A cannot be attached, exported, or executed while Repo B is selected; a feature with a duplicate key/slug/requirement/task ID is rejected before save.

### Phase 2 — connector enforcement

1. Extend the connector scan response with canonical remote, current commit, worktree metadata, and whether the target is the main checkout or a linked worktree.
2. Add `POST /v1/feature/preflight`, which validates project identity, feature manifest, worktree path, branch, remote, baseline ancestry, artifact root, clean-state policy, and active-job locks.
3. Require a successful, short-lived preflight token for agent-run, apply, verification, and artifact-write endpoints. Bind the token to project ID + feature key + canonical path + branch + HEAD SHA.
4. Change locking from `activeJobByRepository` to two locks: canonical worktree path and feature key. Permit different worktrees in the same repository to run independently.
5. Allow Studio artifact writes only under `specs/<feature-slug>/` for feature actions. Keep `.specify/studio/` only for explicitly selected project-summary snapshots.
6. Reject prompts/commands where a selected feature’s manifest and invocation disagree on remote, branch, slug, or path.
7. Save job logs and receipts to feature-owned files only after explicit review, with redaction and size limits.

**Acceptance test:** a request carrying `CAI-142` but pointing to `feat/CAI-143` or another worktree returns a hard failure and writes nothing.

### Phase 3 — artifact, traceability, and conflict controls

1. Make feature artifacts first-class. The Plan and Task Board should render the selected feature’s accepted `plan.md` and `tasks.md`, not the project-wide plan/tasks objects.
2. Introduce a `FeatureRegistry` view showing feature key, status, branch, worktree, base SHA, owned paths, dependencies, overlapping paths, last backup, and handoff link.
3. Validate globally unique story/requirement/task IDs per project and feature-prefixed IDs for all new records.
4. Implement a conflict detector: compare each active feature’s declared paths with Git changed paths and plan-owned paths; flag exact overlap and ancestor/descendant directory overlap.
5. Require dependencies for shared API, schema, lockfile, IaC state, or migration files. A conflict is blocking until a reviewer records a resolution.
6. Generate a machine-readable `checksums.sha256` and traceability report on feature export; CI verifies them.

**Acceptance test:** opening two feature plans in one project cannot cause either plan/tasks receipt to be assigned to the other feature; a shared migration path creates a blocking conflict card.

### Phase 4 — delivery integration and governance

1. Generate a PR template from `handoff.md` with feature key, artifact paths, risk, flag/migration status, checks, and rollback.
2. Support repository-specific CI profiles. Do not hard-code TypeScript prompts or generic validation for Python, Terraform, etc.
3. Require an environment selector and explicit deployment approval separate from feature implementation approval.
4. Configure CI concurrency as `deploy-${{ github.repository }}-${{ inputs.environment }}` (or equivalent), with `cancel-in-progress: false` for production deployments unless the service’s policy permits cancellation.
5. Provide CODEOWNERS/path-owner checks and PR links in Studio rather than direct-to-branch GitHub publication as the default.
6. Track feature flags as records with category, owner, default, environments, expiry, removal task, and tests for both states.

## Policies to adopt immediately

1. **No shared active checkout:** the repository’s default clone is for inspection/integration only; every active implementation uses a linked worktree.
2. **No feature without a key:** informal titles are not identifiers.
3. **No handoff without Git evidence:** every completed feature has a committed package and PR, not only browser data or an exported ZIP.
4. **No secret in Studio:** no access tokens, `.env` contents, production URLs containing credentials, customer data, or proprietary test fixtures in localStorage, prompts, or exports.
5. **No broad agent task:** one task, one worktree, declared paths, declared checks, and a receipt.
6. **No silent merge:** every importer/merge must report exactly which project-wide objects were appended, changed, skipped, or rejected.
7. **No unmanaged flags:** every flag has an owner and removal date.
8. **No concurrent destructive operations:** migrations, IaC apply, and production deployment require their own concurrency lock and approval.

## Daily operator checklist

Before starting an agent:

- [ ] Studio header project key, feature key, repository remote, worktree, and branch all match the manifest.
- [ ] Worktree is a linked worktree and branch is `feat/<feature-slug>`.
- [ ] No unresolved overlap/conflict exists with active features.
- [ ] The selected task is approved and has allowed/prohibited paths and checks.
- [ ] Environment/data source is isolated and contains no production secret/data by default.
- [ ] Feature artifacts and Studio state have been exported/committed since the last material change.

Before handoff:

- [ ] All feature artifacts are under `specs/<feature-slug>/` and reference the same feature key.
- [ ] Requirements/tasks are unique and traceable.
- [ ] Receipt files record changed paths, exact commands, outcome, and final commit.
- [ ] Required checks passed at the final commit; flag-off/flag-on and rollback/migration checks ran where applicable.
- [ ] PR is against the protected default branch and contains no unrelated feature work.
- [ ] Handoff package and Studio state backup are stored durably.

## Recovery playbooks

### Wrong project, repository, branch, or worktree selected

1. Stop the job; do not accept its stage output.
2. Inspect `git status`, `git remote -v`, `git branch --show-current`, and `git worktree list` in the target path.
3. If no writes occurred, correct Studio selection and run preflight again.
4. If writes occurred, preserve the diff in a temporary rescue branch within the actual repository, record the incident in the intended feature’s `handoff.md`, then manually move only reviewed changes through a PR. Do not copy all files blindly.

### Browser state was cleared, corrupt, or belongs to another browser profile

1. Restore the latest exported Studio JSON only after checking its project ID and canonical remote.
2. Reconstruct the feature record from the committed `manifest.yaml`, feature artifacts, receipts, branch, and PR—not from memory.
3. If no export exists, Git is authoritative; create a new Studio record linked to the existing feature package rather than recreating a generic shared plan.

### Two active features conflict

1. Mark both records `blocked` with the same conflict ID.
2. Decide whether to sequence, extract a prerequisite, merge planning only, or intentionally combine the features.
3. Commit the resolution in both manifests and plans; update baseline commits after the prerequisite merges.
4. Re-run audit and tests after rebasing. Never resolve only in chat or a local note.

### A worktree must be retired

1. Confirm merged/abandoned status and that all useful changes are committed or intentionally discarded through normal review.
2. Confirm clean `git status` and retained handoff/backup.
3. Use `git worktree remove <worktree-path>` from the primary checkout. If it was moved, use `git worktree repair`; do not delete it manually.

## Success measures

Track these monthly per portfolio:

| Measure | Target |
| --- | --- |
| Features with a valid manifest, branch, worktree, and committed handoff | 100% |
| Agent runs with successful identity preflight | 100% |
| Cross-feature overwrite incidents | 0 |
| Feature records with unique key/slug/task IDs | 100% |
| Completed features recoverable from Git without browser storage | 100% |
| PRs blocked/reworked due to detected conflicts before implementation | increasing initially, then decreasing as planning improves |
| Expired release flags | 0 |
| Production deploys with environment approval and serialized concurrency | 100% |

## Explicit limitations of the current Studio

This document is a target operating model, not a claim that every guard is already implemented. The first foundation slice is now implemented: bounded browser recovery snapshots before project changes, feature keys/slugs for newly imported features, identity-aware project state, duplicate-ID validation, and a connector preflight before Engine execution. The portability slice is also implemented: the Exporter can download an active-feature-only package containing `specs/<feature-slug>/manifest.json`, scoped artifacts, and receipts. Guided worktree onboarding is implemented: Studio can create a `feat/<feature-slug>` linked worktree inside an allowed root, register its branch/path/baseline on the feature, and route implementation/verification there. Current Studio behavior still has these material limitations:

- Project data and integration settings are browser-local; they need export/commit backup.
- Adding a feature appends stories, functional requirements, and tasks to shared project structures; it does not fully merge plans, schemas, ADRs, or constitution rules, and ID collisions are possible.
- The project ZIP primarily exports project-wide `spec.md`, `plan.md`, `tasks.md`, and `constitution.md`; it is not by itself a feature-isolated archival format.
- `.specify/studio/` is a project-summary output, while Stage 4/5 feature evidence should be in `specs/<feature-slug>/`.
- Connector job locking is currently based on repository path, not feature identity/worktree identity.

Therefore, use the worktree + committed feature-package rules immediately, and implement Phases 1–2 before treating concurrent agent execution as fully guarded by Studio itself.
