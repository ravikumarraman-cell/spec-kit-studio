# Outcome Refinery

Outcome Refinery handles a delivery that compiles or passes basic checks but
misses the intended product outcome—for example, incorrect hierarchy, missing
source mapping, poor contrast, incomplete responsive behavior, or an
integration that was described but not connected.

It automates bounded repair work; it never automates product acceptance.
Passing commands, an agent completion message, or a retained contract are not
evidence that a user-visible outcome is correct.

## Safe repair loop

```text
Diagnose evidence
  → reviewer resolves material ambiguity
  → reviewer starts one bounded repair
  → agent edits only the linked worktree
  → repository and, when applicable, visual verification run
  → evidence is retained for human handoff or a clear stop decision
```

The repair packet prohibits commits, pushes, branch changes, credentials, CI
changes, and unrelated work. The connector rejects writes to the primary
checkout. A synthetic transport task never closes a real delivery task or
unlocks a Journey stage.

## Evidence gates

1. **Repair execution**: a local agent finishes and the connector captures Git evidence.
2. **Repository verification**: Studio runs a declared check; this is a quality signal, not visual proof.
3. **Visual verification**: when reference images exist, Studio requires a
   declared visual command and measured desktop (1440×900) and narrow
   (390×844) screenshots.
4. **Human outcome review**: only a reviewer can decide that the original ask
   has been met and continue normal Journey handoff.

Studio uses a finite retry budget: at most two automatic retries for a
deterministic repair step and one bounded agent redraft. A failed or exhausted
run becomes a visible `needs-decision` state with retained receipts; it does
not silently relax the acceptance contract.

## Operating it

1. Select the feature and open **Outcome Refinery**.
2. Provide the expected outcome and, for visual work, a reference and current
   output image. Images remain local until explicit visual review.
3. Resolve any decision-required finding.
4. Confirm **Start bounded repair**.
5. Review the live job, attempts, changed files, verification output, and
   visual evidence.
6. Use the normal Feature Journey review and approval controls for handoff.

The flow stops before a job starts when no linked worktree, compatible agent,
or valid preflight is available. Connector interruptions preserve the attempt;
Studio never fabricates success after a refresh.

## Extension rule

Visual verification runs only a declared, allowlisted repository script. A
new verifier must return structured pass/fail evidence, validate paths and
timeouts, bound output, and preserve a receipt. Studio never treats a zero
exit code, source-string assertion, or marker file as visual proof.
