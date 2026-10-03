# Governance, Architecture, and Grounding Evidence Policy

## Decision

Spec-Kit Studio should use a **typed, layered evidence model**. It should not
provide a generic “upload documents at Ground impact” feature and imply that
all future agents will consider everything that was attached.

The recommended model is:

```text
Workspace Constitution       → durable rules for every delivery item
Feature Specification        → what must be delivered and why
Grounded Impact Map          → repository facts discovered for this feature
Accepted Technical Plan      → feature-specific technical decisions
Task Packet                  → the smallest relevant subset for one task
```

Each layer has a different owner, scope, retention rule, review gate, and
agent-consumption contract. This makes instructions inspectable and prevents
an agent from quietly treating an unreviewed attachment, stale architecture
diagram, or unrelated policy as binding.

## Why this is the strong recommendation

Unstructured uploads create five serious problems:

1. **False assurance.** A person can reasonably assume that an upload is used
   by every later agent even when it is only stored, truncated, or omitted from
   a bounded prompt.
2. **Conflicting authority.** A slide deck, an older ADR, a ticket comment,
   and a current plan can disagree. Without an authority order, an agent has
   no safe way to decide which one wins.
3. **Poor traceability.** Reviewers cannot tell which sentence or decision
   drove a code change, a test, or a task.
4. **Prompt bloat and leakage.** Sending every attachment to every task is
   slow, costly, hard to review, and can expose material that is not needed
   for that task.
5. **Stale guidance.** A document can remain attached after a decision has
   been superseded, while later work still treats it as current.

The intended operational benefit is less repeated context gathering without
discarding review evidence. Studio cannot establish a delivery-time reduction
for a particular team. The design therefore favors one obvious home for each
kind of evidence and a deterministic rule for what reaches each agent, so the
team can inspect and measure the effect in its own workflow.

## Authority order

When two inputs disagree, Studio should apply this order and show it in the
review UI:

1. Explicit human decision recorded on the current feature and accepted after
   the conflicting item was created.
2. Mandatory workspace Constitution rule.
3. Accepted feature technical plan (`plan.md`) and its referenced ADR,
   contract, or data-model evidence.
4. Accepted feature specification (`spec.md`) and approved requirements.
5. Accepted impact map, but only for repository facts and affected-surface
   claims.
6. Read-only source material, imported documents, tickets, diagrams, and
   notes.
7. Agent inference.

An agent must never resolve a conflict by silently choosing an older upload or
inventing a compromise. It must surface the conflict for human review.

## The five evidence homes

### 1. Workspace Constitution — rules that apply everywhere

Use the Constitution for durable rules that apply across features and tasks:

- security controls and data-handling requirements;
- approved technology and integration boundaries;
- coding standards, accessibility expectations, and testing minimums;
- architectural guardrails such as layering, dependency direction, or API
  compatibility policy;
- release, audit, compliance, and operational constraints.

These are **rules**, not background reading. Each rule should be structured
with a title, statement, category, strictness (`Mandatory` or `Recommended`),
owner, source reference, effective date, and review date.

Current Studio behavior: Constitution rules are saved in the project aggregate
and the task-scoped implementation packet includes them under
`## Constitution`. Ground impact also asks the agent to identify applicable
Constitution rules. This is the correct place for architectural ground rules
that should influence all generated code.

### Settings reference library — upload once, reuse deliberately

The Constitution screen in **Settings** is the one-time home for the source
documents behind durable rules. Its Governance source library retains readable
text documents with the workspace Constitution. The policy for that library
should be:

- upload a document once per workspace, not once per feature;
- retain a readable, versioned copy with its name, upload date, size, and
  source identity;
- use it as read-only review context for an approved agent run;
- derive clear, enforceable Constitution rules from it before work begins;
- add the resulting rules to every relevant task packet; and
- expose the source document and the rules it informed in the task's context
  manifest.

This is **addition, not replacement**. A Settings reference gives every
relevant feature its durable baseline. The accepted feature specification,
impact map, technical plan, and task detail add the information that is unique
to the current delivery item. They are not overwritten or flattened into one
large document.

Do not make a raw library document silently binding merely because it was
uploaded. The binding instruction remains the normalized Constitution rule.
The uploaded source is supporting evidence, unless a reviewer deliberately
promotes a precise statement into a mandatory or recommended rule. This keeps
agent behavior deterministic and makes it possible to audit why a rule
applied.

Recommended enhancement: give each retained source a source link, revision or
effective date, owner, classification, applicability tags, and an explicit
list of the rules it informs. When Studio prepares a task, it should include a
small context manifest that states which library sources were available, which
rules were applied, and which feature-created artifacts supplemented them.

### 2. Feature Specification — the delivery promise

Use Stage 2 for feature-specific product intent:

- user stories and functional requirements;
- acceptance criteria and success measures;
- compatibility boundaries and explicit non-goals;
- feature-specific source contracts and approved business constraints.

An imported PRD, issue, milestone, or requirements document belongs here. It
is retained as source context, then distilled into accepted, traceable
requirements in `spec.md`. The source document should never outrank the
accepted specification after review.

For a document that contains architectural instructions as well as product
requirements, split it during review: product commitments go to `spec.md`;
technical decisions go to the plan or Constitution.

### 3. Grounded Impact Map — repository facts, not policy storage

Use Stage 3 to answer: **what does this feature touch in the real repository?**

The impact map should contain only evidence-backed findings:

- owning directories, components, services, and code paths;
- relevant APIs, schemas, queues, feature flags, and deployment workflows;
- nearby tests and commands that should be run;
- affected callers, compatibility risks, and dependencies;
- the Constitution rules that apply to this feature; and
- unresolved repository facts that need a decision.

Ground impact should be read-only with respect to the repository. A reviewer
accepts the map before design begins. It is not a generic upload bucket.

If a document is needed to interpret the repository—an approved interface
diagram, current system context, or migration inventory—it should be attached
as a **declared reference** with one of these roles:

| Reference role | Appropriate content | Agent treatment |
| --- | --- | --- |
| `repository-context` | Current system diagram, ownership map, runbook | Available to Stage 3 and cited in the impact map. |
| `technical-decision-input` | Existing ADR, approved platform constraint | Available to Stage 4; must be accepted or superseded in the plan. |
| `source-contract` | API contract, schema, canonical interface definition | Available to the stages and tasks that touch that contract. |
| `background` | Research, discovery notes, prior proposals | Review-only; never binding unless promoted. |

The UI must show the reference role, owner, version/date, scope, and whether
it was promoted into an accepted artifact. “Uploaded” is not the same as
“binding.”

### 4. Technical Plan — feature-specific architecture

Use Stage 4, **Design safely**, for decisions that change how this feature is
built:

- selected components and service boundaries;
- API, event, and data-model changes;
- ADRs and rejected alternatives;
- security and privacy controls specific to the change;
- migration, rollout, rollback, observability, and test strategy;
- links to the impact-map evidence and the Constitution rules checked.

The accepted `plan.md` is the authoritative technical decision for the
feature. It must explicitly state whether it adopts, modifies, or rejects
each relevant architecture input. This prevents a later coding agent from
having to interpret multiple competing diagrams.

### 5. Task Packet — only what one implementation task needs

Stage 7 must not send the whole workspace history to a coding agent. For one
task, Studio should assemble a small, deterministic packet containing:

```text
task objective
mapped accepted requirements
relevant accepted plan excerpt and contracts
applicable mandatory Constitution rules
grounded repository paths and focused verification commands
task-specific decision answers and source-contract references
definition of done and receipt requirements
```

The packet should also list omitted context by identifier, so a reviewer can
see that the selection was intentional. The agent can inspect the local
repository when needed, but it must not be expected to discover unstated human
decisions from unrelated files.

## Agent-consumption contract

Studio should make the following promise, visibly, before every agent run:

| Evidence type | Stored as | When an agent receives it |
| --- | --- | --- |
| Mandatory Constitution rule | Structured workspace rule | Every relevant planning and implementation packet. |
| Accepted feature requirement | `spec.md` and structured requirement record | Planning; only mapped requirements for implementation. |
| Accepted impact finding | Feature impact-map evidence | Design, planning, and relevant task packets. |
| Accepted plan/ADR/contract | Feature `plan.md` and linked artifacts | Delivery planning and relevant implementation tasks. |
| Declared reference document | Reference record with role and scope | Only stages/tasks covered by its declared role. |
| Background upload | Retained source context | Never automatically; only after explicit promotion. |

This requires a **context manifest** for every agent run. The manifest should
list artifact IDs, accepted timestamps, version hashes, roles, and excerpts
included in the packet. It should be retained beside the agent receipt.

An implementation receipt should therefore answer: “Which accepted rules,
requirements, decisions, repository facts, and verification commands did this
run use?”

## Storage and retention model

Studio is local-first. The current project aggregate is persisted through the
workspace storage service (IndexedDB, with a legacy localStorage fallback),
not uploaded to a cloud service merely because it is displayed in Studio.

The recommended storage model is:

```text
SpecKitProject
├── constitution.rules[]                 workspace-scoped structured rules
├── featureInbox[].sourceContent         bounded, imported source context
├── featureInbox[].impactMap             accepted Stage 3 evidence
├── featureInbox[].specification          accepted canonical spec.md snapshot
├── featureInbox[].architecturePlan       accepted plan.md snapshot
├── featureInbox[].deliveryPlan           accepted tasks.md snapshot
├── featureInbox[].references[]           proposed typed reference records
└── journey attempts / task receipts      immutable evidence and context manifests
```

Repository-owned engine artifacts remain in the feature directory, for
example `specs/<feature>/spec.md`, `plan.md`, and `tasks.md`. Studio evidence
and receipt metadata remain in the local project record and portable handoff
packages. Code itself remains in Git, not duplicated into evidence archives.

Attachments should be bounded by size and MIME type. For an enterprise
deployment, store large original files in an approved document system and
retain only an immutable reference, checksum, access classification, and
reviewed excerpt in Studio. Never place credentials, secrets, personal data,
or unrestricted document dumps in agent packets.

## Validation before acceptance and export

Every evidence promotion must be validated before it can affect later work:

1. **Reference intake:** validate type, size, owner, scope, classification,
   source URL/path, revision date, and declared role.
2. **Promotion:** require a reviewer to state what the reference contributes
   and which accepted artifact owns the resulting decision.
3. **Artifact acceptance:** validate the selected SDD engine contract and
   feature scope; reject templates and unscoped artifacts.
4. **Task generation:** reject tasks that do not map to accepted requirements
   or omit applicable mandatory rules.
5. **Implementation launch:** create and retain the context manifest; require
   an isolated worktree for code-writing tasks.
6. **Handoff export:** preflight the reviewed decision, canonical `spec.md`,
   structured stories/requirements, feature references, and engine contract.

Current Studio already preflights PM reviewed-delivery handoff ZIPs for the
accepted PM decision, canonical spec, structured stories/requirements,
workspace linkage, and selected SDD engine contract. That direction should be
extended to typed reference records and their context manifests.

## User experience rules

The experience should make the correct action obvious:

- In **Constitution**, say “Rules every relevant agent must follow.”
- In **Feature intake**, say “Source material for this delivery item.”
- In **Ground impact**, say “Verify repository facts and applicable rules.”
- In **Design safely**, say “Record the technical decision this feature will
  follow.”
- In **Implement**, show “This task receives these 6 accepted inputs,” with a
  link to the context manifest.

Do not use ambiguous verbs such as “upload,” “attach,” or “include” without
displaying the evidence role and consumption scope. A user should always be
able to answer these questions before clicking an agent action:

1. Is this document binding, review-only, or background?
2. Which stage or tasks will receive it?
3. Which accepted artifact supersedes it if they conflict?
4. Where is it retained and who can access it?
5. Can I see the exact context sent to the agent?

## Recommended implementation roadmap

### Phase 1 — clarify and enforce current behavior

- Do not add a generic Ground impact upload button.
- Add in-product guidance that directs workspace-wide rules to Constitution,
  feature scope to Stage 2, and architecture decisions to Stage 4.
- Show the existing accepted Constitution, spec, impact-map, plan, and task
  evidence on each stage’s “What this agent receives” disclosure.
- Preserve the current ZIP preflight and apply the same fail-closed philosophy
  to every portable handoff.

### Phase 2 — add typed references

- Introduce `FeatureReference` with ID, title, role, source, revision,
  classification, scope, checksum, excerpt, promotion state, and accepted-by.
- Permit reference intake from feature scope and design—not from Ground impact
  as an undifferentiated file drop.
- Require a role and scope at intake; refuse “unknown” references from agent
  packets.
- Render a reference ledger in Ground impact and Design safely.

### Phase 3 — make context auditable

- Generate an immutable context manifest for each planning and implementation
  attempt.
- Show the manifest in the live task view and store it with the reviewed task
  receipt.
- Surface stale, conflicting, or superseded references before an agent runs.
- Add a quality-gate check that every mandatory Constitution rule and required
  feature reference has either been applied, waived with a reason, or marked
  not applicable.

## Success criteria

This policy is successful when:

- a PM, BA, architect, developer, or security reviewer can place a document
  correctly without needing to understand prompt construction;
- every code-writing task has a reviewable list of the exact accepted inputs
  it received;
- no arbitrary upload silently influences an agent;
- a stale or conflicting architecture document is visible before task launch;
- a handoff can restore structured, feature-scoped stories, requirements, and
  accepted technical decisions without losing traceability; and
- reviewers can explain any implementation change from task → requirements →
  plan → impact evidence → governing rules.

## Immediate recommendation for your current workflow

1. Put durable architectural and ground rules into **Constitution** as clear,
   individually reviewable rules.
2. Put the current feature’s architecture document into the evidence reviewed
   during **Design safely**, and record its outcome in the accepted `plan.md`.
3. Use **Ground impact** to verify those decisions against the connected
   repository and capture affected code, tests, contracts, and risks.
4. Do not rely on a document merely being uploaded as proof that coding agents
   will follow it. Require it to be promoted into a Constitution rule, accepted
   requirement, accepted plan decision, or explicitly scoped reference.
