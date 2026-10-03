# Delivery workflow: claims, controls, and measurement

Spec-Kit Studio is a local-first workflow tool for teams that use AI agents
alongside human review. It maintains a feature-scoped record of the selected
scope, accepted decisions, repository evidence, agent-run receipts, and final
handoff. It does not prove that a change is correct and it does not replace
engineering judgment, repository controls, tests, or deployment governance.

At each point in a delivery, the interface is intended to answer:

1. **What am I working on now?**
2. **What is the one safe next action?**
3. **What evidence will the next person receive?**

The answer is feature-scoped and persists across refreshes. Studio keeps the
active work separate from the history that led to it, so a completed handoff
does not look like the current person's unfinished work.

## Product claim and limits

Studio's product claim is narrow: it can reduce avoidable coordination and
reconstruction work in an AI-assisted delivery by preserving reviewed context,
bounding execution, and making the next decision explicit. It does **not**
claim a fixed percentage reduction in lead time, agent reliability, code
quality, security, compliance, or delivery success. Those outcomes depend on
the repository, task complexity, agent, model, review practice, test suite,
and team operating model.

The mechanism is inspectable:

| Common source of delay or risk | Studio control | What it does not establish |
| --- | --- | --- |
| Re-explaining scope between product, architecture, security, and delivery | Accepted persona artifacts and feature-scoped handoffs | That the source decision was correct or complete |
| An agent acting on broad or stale context | One selected, approved task with a bounded context packet | That the agent follows every instruction perfectly |
| Repository changes happening in a shared checkout | Registered linked worktree and explicit local confirmation | That all changed files are desirable |
| A result being accepted because an agent completed | Human stage approval and reviewed task receipts | That human review found every defect |
| Ambiguous handoff status | Separate active role, handoff origin, artifact package, and Done record | Ownership outside the Studio workflow |

The product is useful when these controls remove real local friction. Teams
should validate that with their own baseline metrics rather than assume it.

## The two kinds of role information

Studio uses two explicit role records:

| Record | Meaning | What it changes |
| --- | --- | --- |
| **Handoff origin** | The persona that supplied accepted context, such as a Product Manager or Security Researcher. | It is read-only provenance and remains available as context. |
| **Active working role** | The person responsible for the current shared Feature Journey. | It drives the current-role marker, sidebar, and work surface. |

For example, a Product Manager can accept a reviewed delivery and hand it to a
Developer / Architect. Once the Feature Journey begins, the sidebar shows the
shared Journey and the Developer / Architect as the working role. The Product
Manager remains visible only as **handoff context**. Refreshing the browser
does not turn that completed Product Manager workflow back into active work.

## The shortest controlled path

### Start with a persona when a decision needs a clear owner

- **Product Manager:** accepts outcome, scope, requirements, and, where the
  selected engine requires it, the canonical `spec.md`.
- **Business Analyst:** clarifies business scope and acceptance evidence.
- **Developer / Architect:** accepts technical approach, guardrails, and a
  feature plan.
- **Security Researcher:** accepts required controls and verification evidence.

Each persona finishes with an explicit handoff and a **Done** action. Done
records that person’s completion; it does not start work for the receiving
role, change code, or grant repository access.

### Use the shared Feature Journey for delivery work

The shared journey is the one active route once a receiving role begins
delivery:

1. Connect safely
2. Describe feature
3. Ground impact
4. Design safely
5. Plan delivery
6. Quality gate
7. Implement deliberately
8. Verify and hand off

An imported Studio handoff still establishes a repository baseline first.
Studio then credits only the stages proven by the handoff. For a reviewed
Product Manager delivery, Stage 2 is already proven; after Connect safely the
next work is Stage 3, Ground impact. Studio does not require users to re-enter
accepted source material merely to advance a screen.

## Agentic-work guardrails

Studio combines evidence; it does not flatten or silently overwrite it.

- Workspace-wide architecture, policy, and governance documents belong in
  **Settings → Constitution**. They are reusable reference context.
- Feature-specific facts belong in the accepted `spec.md`, impact map,
  `plan.md`, and `tasks.md` created during the Journey.
- The agent receives only relevant accepted rules and feature evidence in a
  bounded task packet. A raw uploaded document does not become a mandatory
  instruction until a reviewer turns its content into a Constitution rule.
- Local agent execution requires an explicit action, connector preflight, and
  a registered feature worktree for implementation. The browser cannot supply
  an arbitrary executable or command line to the connector.
- A coding-agent run does not advance a stage. A reviewer retains a task
  receipt only after inspecting changed-file and verification evidence.
- Repository actions remain local and explicit. Studio does not silently
  commit, push, merge, deploy, or approve results.

These controls reduce the chance of avoidable scope drift and lost context;
they do not sandbox an agent against every possible repository-side effect.
Use normal branch protection, CI, code review, access control, and deployment
controls in addition to Studio.

See the [governance and architecture evidence policy](governance-and-architecture-evidence-policy.md)
for the retention model and document categories.

## Repository and GitHub access

Product discovery, analysis, and persona review can happen without a local
connector. Repository scans, local coding-agent runs, worktree creation, and
repository commands require the optional loopback connector and an explicit
confirmation.

GitHub access is separate from local repository access. Studio can use the
configured enterprise GitHub/OIDC integration for approved Issue or Milestone
imports, or the developer’s existing local `gh` sign-in for an explicitly
confirmed pull-request creation after a clean branch has already been pushed.
Studio never creates a hidden commit, pushes, merges, or deploys code.

See [GitHub Enterprise SSO/OIDC](github-sso-oidc-setup.md) and the [local
connector](local-connector.md) guide for setup and limits.

## Measure whether Studio is helping

Delivery observability shows evidence-backed timing rather than estimates:

| Measure | Meaning |
| --- | --- |
| **End-to-end elapsed** | Clock time since the Feature Journey started. |
| **Code-generation runs** | Sum of retained agent start/end times for reviewed implementation task receipts. Each task is listed with its duration. |
| **Studio workflow actions** | Timed scan, generation, retry, and approval events recorded by Studio. This is not code-generation time. |
| **Unattributed elapsed** | The remaining clock time. It may include reading, review, waiting, or work outside Studio; Studio does not claim which. |

If an earlier implementation receipt has no agent start/end times, Studio says
that timing is unavailable instead of inventing a duration. A code-generation
run counts only after its reviewed task receipt is retained with changed-file
and verification evidence.

To determine whether Studio shortens a team's AI-assisted delivery cycle,
compare similar delivery items before and after adoption. Measure at least:

1. time from ready technical work to an accepted handoff;
2. retained code-generation duration and reruns;
3. human review and validation time, recorded separately; and
4. rework signals, such as reopened stages, failed checks, reverted changes,
   and post-merge defects.

Do not use one end-to-end clock as a productivity claim. It includes external
work and waiting that Studio cannot attribute. It is useful for investigation
and like-for-like comparisons, not proof of an individual or team's output.

## Finish cleanly

At the final stage, verify the accepted implementation receipts and the
repository’s documented validation. The delivery handoff keeps three distinct
things separate:

1. strict SDD-engine artifacts (`spec.md`, `plan.md`, and `tasks.md`);
2. Studio delivery evidence, including reviewed task receipts; and
3. application code, which remains in Git.

The final **Done with this handoff** action records a human approval of the
handoff package. It does not create a commit, push a branch, merge, deploy, or
close a pull request.

## Conditions for responsible adoption

Studio is most useful where the team already has a repository owner, branch
and review policy, a documented validation route (or an explicit manual-review
route), and reviewers who can assess changed-file and test evidence. Configure
the local connector with a narrow allowed repository root and use the least
privilege needed for GitHub access.

Studio records workflow state and evidence. It is not a source of authority
for production access, pull-request approval, security sign-off, or compliance
certification. Those decisions remain with the team and its existing controls.

For complete artifact details, see [Feature Journey](feature-journey-engine-first.md)
and [Developer/Architect](developer-architect-persona.md).
