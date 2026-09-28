# Outcome Refinery bounded autopilot

## Purpose

Outcome Refinery converts a demonstrated delivery miss into a bounded repair
run. It is designed for cases where an implementation compiles or passes basic
tests but misses the requested product outcome: flattened information
hierarchy, missing source mapping, poor contrast, incomplete responsive
behavior, or an integration that was described but not actually connected.

Autopilot automates repair execution and repository verification. It does not
automate product acceptance. A passing command, an agent's completion message,
or a retained contract is never evidence that the user-visible outcome meets
the ask.

## Safety model

The flow has one explicit user start and a finite retry budget. The selected
agent can edit only the registered linked Git worktree. The connector rejects
writes to the primary checkout, and the repair packet prohibits commits,
pushes, branch changes, credentials, CI changes, and unrelated work.

The synthetic task identity `T900` is only a connector transport label. It is
never added to `tasks.md`, never closes an official delivery task, and never
unlocks a Journey stage.

| Autopilot may do | Autopilot may not do |
| --- | --- |
| Diagnose an evidence-backed gap | Invent an expected outcome or source |
| Persist the repair contract and reopen downstream planning | Change the primary checkout |
| Invoke one compatible local implementation agent | Commit, push, create a branch, or modify credentials |
| Run the repository's discovered verification command | Mark an implementation receipt reviewed |
| Retry a failed agent/check within the fixed budget | Approve a Journey stage or final handoff |

## Lifecycle

```text
Diagnose
  → ready-to-run
  → user confirms bounded autopilot
  → contract retained + stage 4 reopened
  → repair agent runs in linked worktree
  → repository verification runs
       ├─ failed → retry, while attemptCount < 2
       ├─ retry budget exhausted → needs-decision
       └─ passed → verifying
  → independent source / responsive / visual evidence
  → human reviews and approves normal Journey handoff
```

`OUTCOME_REFINERY_MAX_ATTEMPTS` is currently `2`. It is intentionally a code
constant, not an unbounded user preference: a bad repair prompt should produce
a reviewable stop condition, not repeat edits indefinitely.

## Evidence gates

There are three independent gates:

1. **Repair execution** — the local agent exits successfully and the connector
   captures Git evidence.
2. **Repository verification** — Studio runs the repository's discovered test
   command. This is a code-quality signal, not visual acceptance.
3. **Outcome verification** — a reviewer retains evidence that proves the
   original ask. Visual features require source hierarchy, desktop and narrow
   viewport evidence, design-system/contrast review, and accessibility review.

Only the third gate can move a feature toward normal human handoff. If the
repository lacks a declared test command, or the result cannot prove the
requested visual behavior, the run stops in `verifying` or `needs-decision`.

## Plug-in points

The orchestration is deliberately separated into pure state transitions and
browser/connector integration.

- `src/lib/outcomeRefinery.ts`
  - diagnosis and repair-contract generation
  - `outcomeRefineryAutopilotPrompt()` — the isolated repair packet
  - start/finish attempt transitions and durable receipts
- `src/components/refinery/OutcomeRefinery.tsx`
  - explicit user consent, compatible-agent selection, job polling, and retry
    sequencing
- `connector/server.mjs`
  - existing `startLocalAgentTask` worktree preflight and
    `startFeatureVerification` command execution

To add another verifier, do not embed it in the agent prompt. Add a small
adapter that returns a structured pass/fail result, then feed that result into
`finishOutcomeRefineryAutopilotAttempt()`. Examples include a Playwright
desktop/mobile screenshot run, a contrast scanner, a source-coverage test, or
a domain integration health check. The adapter must have its own timeout,
bounded output, worktree path validation, and receipt summary.

## Operation

1. Select the feature and describe the expected and delivered outcomes.
2. Diagnose. Resolve any decision-required finding rather than letting the
   agent guess.
3. Confirm **Run bounded autopilot**. Studio selects a detected local agent
   with `implementation` capability.
4. Review every attempt in Run history. Agent and verification outputs remain
   in connector job history; the durable feature record stores only bounded,
   redacted summaries and changed-file names.
5. For visual work, attach/retain the desktop and narrow viewport evidence,
   then use the ordinary Feature Journey review and approval controls.

## Failure behavior

- No linked worktree, no compatible agent, or a failed feature preflight: no
  job starts.
- Agent failure: one automatic retry receives only a bounded failure summary.
- Test failure: one automatic retry receives the test failure summary.
- Connector interruption: the attempt remains durable; Studio never fabricates
  a successful result after a refresh.
- Retry exhaustion: `needs-decision`, with preserved receipts and a clear
  stop reason.

## Maintenance rules

- Keep transport guardrails in `outcomeRefineryAutopilotPrompt()` and connector
  worktree enforcement in the connector. Do not rely on either alone.
- Add a unit test for every new state transition and verifier result.
- Keep official task completion separate from autopilot attempts.
- Keep outcome evidence structured and bounded; do not store raw screenshots,
  raw agent output, secrets, or repository source in the project record.
- Any new automatic write action requires an explicit confirmation phrase and
  must operate only on the registered feature worktree.
