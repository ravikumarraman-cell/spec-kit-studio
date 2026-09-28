# Outcome Refinery

## Purpose

Outcome Refinery is Spec-Kit Studio's closed-loop **expectation-to-evidence repair workflow**. It helps a team recover when an implementation is valid code but is not the intended product: the visual design is wrong, important data is missing, a workflow does not behave as expected, or a feature/user story left too much open to interpretation.

It does not treat the implementation as the only thing to fix. It finds the earliest inadequate artifact—the imported feature, user story, specification, plan, task, source mapping, or verification evidence—and makes the smallest traceable repair needed for the next run to produce the expected outcome.

The goal is not “make the agent try again.” The goal is **make the desired outcome executable, verifiable, and repeatable**.

## Product promise

Outcome Refinery should feel native to Studio:

- It starts from a feature's existing Journey, worktree, approvals, artifacts, and evidence.
- It explains *why* a result missed, in plain language, before proposing a repair.
- It makes the expected result concrete through source-backed, testable acceptance criteria.
- It preserves provenance: every diagnosis, proposed edit, run, verification, and handoff is retained.
- It is token-light by default. Known failure modes are diagnosed locally; an agent is only used for bounded work that needs reasoning.
- It never quietly changes the primary checkout, commits, pushes, deploys, or approves a stage.

## What users see

### Entry points

Provide an **Improve outcome** action in four places:

1. Kit Guide after an error, failed visual comparison, or “this does not match” request.
2. Feature Journey's retained result/evidence panel.
3. Feature registry entry for an in-progress or completed feature.
4. The handoff screen, as **Refine and re-run**, when the user discovers a mismatch after Stage 8.

The action opens an Outcome Refinery drawer or full-screen workspace tied to one feature. It must never lose the user’s current screen.

### Refinery workspace

The workspace has five compact, progressive sections:

1. **Expected outcome** — the source ticket text, approved feature artifacts, supplied reference screenshot(s), and explicit success statements.
2. **Delivered outcome** — retained implementation evidence, current screenshots, changed files, test output, and source-data availability.
3. **Gap diagnosis** — a ranked, evidence-linked list of observable mismatches, grouped as specification, data/source, layout/design, behavior, accessibility, or verification gaps.
4. **Repair proposal** — a human-readable diff of exact changes to the feature/story/spec/plan/tasks plus the planned lifecycle.
5. **Run history** — attempts, duration, input/output artifact hashes, verification status, and final handoff result.

The default screen answers three questions immediately:

> What did we expect? What was actually delivered? What will change before the next run?

### A user-friendly repair card

Each proposed repair card contains:

- A precise issue, e.g. “Infrastructure section renders an ungrouped asset list instead of six service-category tiles.”
- Evidence links: screenshot callouts, source artifact excerpts, paths, and failed checks.
- Root cause classification and confidence.
- The exact artifact edits, shown as a reviewable diff.
- The verification that proves the repair, e.g. screenshot comparison, semantic UI check, API/source mapping check, and focused automated test.
- Its automation status: `Safe to apply`, `Needs source decision`, or `Needs owner approval`.

## Closed-loop lifecycle

Once the user has supplied/confirmed the expected outcome and enabled **Autopilot within this refinement**, Refinery can proceed without pauses until it reaches its final review gate.

```text
Capture expectation
  -> Diagnose gap
  -> Draft repair contract
  -> Validate contract locally
  -> Apply approved artifact repair in isolated worktree
  -> Regenerate downstream plan/tasks
  -> Implement in linked implementation worktree
  -> Verify behavior, data, accessibility, and visual fidelity
  -> Retry only the failed bounded step (maximum configured attempts)
  -> Produce a final outcome report for human acceptance
```

Autopilot is scoped to a single Refinery run and shows its exact authority before it starts. It may update the feature’s owned artifacts and worktree code only after the user starts that run. It must stop rather than guess when a repair requires a product decision, an unavailable source, an external side effect, a credential, an unapproved scope expansion, or exceeds its retry/time/token budget.

The final human acceptance is intentional: it is the product owner’s confirmation that the delivered result meets the expectation. Studio must not simulate this approval.

## Repair contract

The central artifact is a versioned `refinery-contract.md` stored under the feature’s Studio metadata. It makes the repair reproducible rather than embedding the interpretation only in an agent prompt.

```md
# Outcome Refinery Contract — OR-001

## Expected outcome
- Reference: `reference-dashboard.png` (hash …)
- Fidelity target: preserve information hierarchy, section grouping, density,
  responsive behavior, and the existing application theme.

## Required screen contract
- Render exactly six infrastructure groups: Compute, Database, Networking,
  Storage, AI & ML, and API Management.
- Each group shows its total resource count and its leading service components.
- Never substitute an ungrouped raw asset list for this section.

## Source contract
| Visible field | Authoritative source | Empty behavior |
| --- | --- | --- |
| Category total | `assets_data` grouped by service category | `No Source` |
| Leading components | `assets_data` grouped by component/service | `No Source` |

## Verification contract
- Screenshot at desktop and narrow viewport matches the reference hierarchy.
- Semantic check finds the six named groups and their counts.
- Every visible field has a source mapping or displays `No Source`.
```

The contract is intentionally structured, bounded, and reviewable. Prompts are generated from it; prompts are never the only source of truth.

## Diagnosis model

Diagnosis is evidence-first, not model-first. It combines deterministic checks with optional local signed-in Copilot or Codex reasoning.

| Gap class | Deterministic evidence | Optional agent task |
| --- | --- | --- |
| Specification ambiguity | missing acceptance rule, unresolved placeholder | translate user intent into explicit, testable clauses |
| Visual mismatch | screenshot pair, DOM/layout assertions, existing theme inventory | identify observable hierarchy/grouping differences |
| Data/source mismatch | source mapping coverage, API inventory, unavailable fields | find the narrowest valid existing source |
| Behavior mismatch | route, interaction, API, and test evidence | propose bounded behavior correction |
| Accessibility mismatch | axe/focus/semantic checks | explain remediation in the component context |
| Verification weakness | missing tests or non-discriminating tests | add outcome-oriented verification requirements |

Every diagnosis must cite evidence and distinguish `observed`, `inferred`, and `unknown`. If no authoritative data source can be found, the repair contract requires the exact user-visible value **No Source**—never fabricated data or a silent fallback.

## Visual fidelity mode

Visual Fidelity is activated when the feature has a reference image or a user supplies one through Kit Guide.

1. The browser normalizes reference and current screenshots locally, strips metadata, and bounds their size.
2. Refinery extracts a deterministic visual inventory: viewport, sections, headings, count cards, grouping, responsive breakpoints, colors/tokens, and prominent controls.
3. A local visual-capable provider may inspect the two files only when the user explicitly selects **Analyze visual match**.
4. Refinery converts findings into a binding visual acceptance contract; it does not simply add “match screenshot” to a prompt.
5. The implementation run must retain desktop and narrow-viewport screenshots plus semantic checks.
6. A feature cannot claim visual verification if only a textual agent assertion exists.

The fidelity target should be “materially indistinguishable in layout, hierarchy, grouping, and interaction,” while still allowing legitimate dynamic content and accessibility improvements. Exact pixels are only required when the user explicitly requests pixel fidelity.

## Automation policy

### Can run automatically within an enabled Refinery run

- Read feature-owned artifacts, retained evidence, and linked-worktree changes.
- Diagnose known failure states locally.
- Generate or update feature-owned specs, plans, tasks, and tests in the isolated worktree.
- Regenerate downstream artifacts when an upstream artifact changes.
- Run allowlisted project verification commands in the implementation worktree.
- Capture evidence and retry a failed bounded step according to policy.
- Produce a final handoff package and concise outcome report.

### Must stop and request a decision

- No authoritative source is present and the owner must choose semantics beyond `No Source`.
- A repair changes the feature’s stated business scope, acceptance policy, security posture, or dependency boundary.
- The target requires credentials, a network action, data mutation, deployment, commit, push, or pull request.
- The run would modify the primary source checkout.
- A retry budget, duration budget, or token budget is exhausted.
- Visual evidence conflicts materially with the written acceptance contract.

### Never do

- Auto-approve a Journey stage or assert human satisfaction.
- Modify application code during planning-only stages.
- Copy sandbox output into the source checkout without integrity validation.
- Hide failed attempts, overwrite evidence, or silently relax acceptance criteria.

## State machine and resilience

```text
idle -> collecting_evidence -> diagnosing -> contract_draft
     -> contract_validating -> ready_to_run -> running
     -> verifying -> repaired | needs_decision | failed | cancelled
```

State transitions are append-only receipts with input and output hashes. The UI derives action availability from the latest terminal receipt, preventing a failed run from exposing “Approve and continue.” Resuming after connector restart reads the persisted receipt and revalidates the worktree rather than trusting browser memory.

Retries are step-specific: a failed visual check reruns verification, not implementation; an invalid task artifact regenerates tasks, not the whole feature. Default policy:

- Maximum 2 automatic retries for the same deterministic repair step.
- Maximum 1 bounded agent redraft before `needs_decision`.
- Maximum 15 minutes per individual step; show elapsed time and attempt count.
- User-configurable total run budget, with conservative defaults.

## Modular architecture

```text
components/refinery/
  OutcomeRefinery.tsx          orchestration shell
  EvidenceComparison.tsx       expected vs delivered UI
  DiagnosisList.tsx            evidence-linked findings
  RepairProposal.tsx           artifact diff and authority preview
  RefineryRunTimeline.tsx      attempt/duration receipts

lib/outcomeRefinery/
  contracts.ts                 pure types + validation
  diagnosis.ts                 deterministic diagnosis rules
  visualInventory.ts           local visual acceptance extraction
  sourceMapping.ts             field-to-source coverage
  repairPlanner.ts             derive minimal artifact edits
  lifecycle.ts                 state-machine transition rules
  retryPolicy.ts               bounded retry decisions

connector/refinery/
  evidence.mjs                 worktree-safe evidence collection
  execute.mjs                  allowlisted lifecycle actions
  visual-review.mjs            explicit local visual analysis
```

`Kit Guide` remains the conversational front door. It can create a `RefineryIntake` from a chat diagnosis or screenshots, but it does not itself mutate artifacts. `Outcome Refinery` owns contracts, state, receipts, and lifecycle execution. `Feature Journey` remains the source of approval and evidence truth.

## Token and performance design

Outcome Refinery must be fast and economical by construction:

- Run deterministic source/artifact/DOM checks before calling a model.
- Send only the repair contract, relevant artifact excerpts, compact diagnostics, and selected screenshot pair—not repository source or chat history.
- Cache evidence by content hash; do not reanalyse unchanged images or artifacts.
- Use small, stage-specific prompts and compact structured responses.
- Prefer one model call per planning/diagnosis phase, not one per finding.
- Lazily load Refinery UI and image-processing code only when opened.
- Use a background connector job with streamed receipts so the browser remains responsive.
- Redact credentials and cap all input/output, screenshot dimensions, and retention windows.

The UI reports model use plainly: `No model used`, `Local Copilot`, or `Local Codex`, together with token/attempt/duration totals when available. Users should be able to understand cost and time without reading logs.

## Required verification

Each Refinery implementation requires tests at three levels:

1. **Pure unit tests** for contract parsing, scope classification, retry policy, source mapping, and approval eligibility.
2. **Component tests** for evidence comparison, repair diffs, explicit stop states, accessibility, and no false “approved” controls.
3. **End-to-end worktree tests** proving that a reference mismatch becomes a repair contract, produces bounded artifact changes, runs in the linked worktree only, and cannot reach handoff until its specified evidence passes.

For source-backed UI work, add a fixture matrix containing complete data, partial data, unknown source, stale values, narrow viewport, and keyboard-only interaction. The `No Source` path is a first-class test case.

## Success measures

- First re-run matches every binding acceptance criterion.
- Zero untraceable changes to feature artifacts or source worktrees.
- Zero false approvals after failed/legacy/unverified runs.
- Every visible source-backed value maps to an authoritative source or `No Source`.
- Median diagnosis uses no model request for recognized workflow failures.
- Users can state the next action and why in one screen, without leaving Studio.

## Delivery slices

1. **Foundation**: contracts, receipts, read-only evidence comparison, deterministic diagnosis, and Kit Guide “Improve outcome” intake.
2. **Artifact repair**: spec/plan/task diffs, visual/source contract validator, human-started repair execution in the isolated planning worktree.
3. **Lifecycle automation**: linked implementation worktree execution, bounded retries, evidence capture, and final report.
4. **Visual/source fidelity**: screenshot pairing, semantic UI checks, data mapping matrix, and responsive evidence.
5. **Operational hardening**: resumability, cancellation, limits, telemetry, accessibility audit, and end-to-end regression fixtures.

## Definition of done

Outcome Refinery is ready when a user can attach the expected screen and a delivered screen, receive an evidence-backed explanation of the mismatch, review the exact repaired feature contract, start a bounded autonomous refinement, and receive a final retained report that either proves the outcome meets the contract or clearly identifies the one human decision required to proceed.
