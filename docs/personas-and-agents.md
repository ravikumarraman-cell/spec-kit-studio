# Personas, agents, and Spec-Kit Studio

This guide explains where an AI agent helps each Studio persona, what Studio
adds to that interaction, and what remains a human decision. It describes
current behavior, not a future product promise.

## The short answer

GitHub Copilot and other local agents are useful for drafting, summarizing,
and exploring. Spec-Kit Studio is useful when that work must become a bounded,
reviewable delivery record that another role, an implementation agent, or a
reviewer can safely use later.

They are complementary. Studio does not replace an agent's interactive help,
and an agent does not replace Studio's scope, acceptance, evidence, and
handoff controls.

| Need | Use an agent directly | Use Studio |
| --- | --- | --- |
| Explore an idea or rewrite a paragraph | Fast, conversational drafting in a local editor. | Usually unnecessary until the idea needs review or handoff. |
| Turn a request into delivery scope | Can propose a draft, but the result remains in an individual conversation or file unless the user organizes it. | Keeps the selected feature or story, requirements, acceptance evidence, assumptions, and decision state together. |
| Hand work from product to engineering or security | A user must manually choose, copy, and explain the relevant context. | Shares only accepted, feature-scoped, source-labelled persona artifacts through declared consumption rules. |
| Plan and implement a repository change | Can suggest or make edits in the active checkout, subject to the agent and repository setup. | Requires explicit confirmation, a registered linked worktree, approved task scope, and retained verification receipts for connector-led work. |
| Explain why a decision was made later | Depends on a chat history, prompt, local notes, or individual recollection. | Retains an accepted artifact, its scope, its upstream evidence, and its relationship to the Feature Journey. |

Studio does not claim that a retained artifact, an agent response, or a passing
command proves that a product outcome is correct. Human review, code review,
CI, accessibility checks, security review, and release controls remain
separate responsibilities.

## Why start with a reviewable specification or Studio draft?

It is the decision point between an unstructured request and delivery work.
Studio turns a milestone, issue, document, or short idea into a bounded draft
that can be inspected before it is treated as delivery scope.

| Benefit | Practical meaning |
| --- | --- |
| Shared delivery contract | Captures the intended users, requirements, assumptions, boundaries, acceptance criteria, and open questions in one feature- or story-scoped record. |
| Safer handoff | Product, analysis, architecture, security, and delivery workflows consume accepted context through declared rules instead of relying on copied prompts or chat memory. |
| Traceability | Retains the source and the acceptance decision, so a later reviewer can understand what entered the delivery workflow and why. |
| Human control | A draft is not approval. Studio does not treat it as authorization to implement, commit, deploy, or advance the Feature Journey. |
| Engine-ready output | Accepted artifacts can be projected into the selected SDD engine's expected format; the current engine is GitHub Spec Kit. |

The local Studio draft is the fast path when no planning agent is available.
For Product Manager discovery, a detected agent can instead prepare a
repository-free draft from the supplied source. It runs in a disposable empty
directory and does not clone, inspect, test, or modify the application.
Repository-aware work starts only at the later Developer/Architect handoff.
Both paths end with the same human decision: review, edit, accept, or discard
the result.

## Current agent assistance by persona

| Persona | What the person owns | Current agent help in Studio | What Studio contributes | What it does not do |
| --- | --- | --- | --- | --- |
| Product Manager | Outcome, target users, scope, non-goals, acceptance criteria, and unresolved decisions. | Optional, read-only agent drafting from the supplied milestone, feature, or document. It runs in a disposable repository-free directory and can expand an initial request into clearer users, success criteria, boundaries, decisions, acceptance anchors, user stories, and requirements. | Saves the resulting Product brief as a review candidate tied to the selected delivery item. The PM can accept or discard it, and accepted content becomes controlled input for downstream roles. | It does not require a repository clone, inspect source code, run tests, decide priorities, approve delivery, or modify source code. |
| Business Analyst | Business problem, clarified scope, acceptance evidence, assumptions, and questions. | No dedicated persona-agent enrichment action is currently exposed. An agent may still be used later through the guarded delivery workflow after planning. | Creates a reviewable Business analysis package and can consume an accepted Product brief without copying it by hand. | It does not scan a repository, approve requirements, or invent business facts. |
| Developer/Architect | Technical approach, constraints, change surface, risks, and proof plan. | No dedicated architecture-agent enrichment action is currently exposed; the package is intentionally human-authored. A selected local coding agent can be used only later through the approved-task worktree workflow. | Keeps technical decisions feature- or story-scoped; presents accepted product, analysis, and security context; and carries the package into design and delivery planning. | It does not claim repository facts without connected evidence, approve architecture, or implement code. |
| Security Researcher | Security boundary, controls, findings, mitigations, and verification evidence. | No dedicated security-agent enrichment action is currently exposed. | Creates a reviewable Security research package and shows accepted product, analysis, and technical-decision context that is relevant to the assessment. | It does not claim a compliance assessment, alter code, or approve a release. |

The exact permitted handoffs are defined in [persona artifact
consumption](persona-artifact-consumption.md). If a persona artifact has not
been accepted, is outside the delivery item's scope, or is not declared for a
consumer, Studio does not inject it into that workflow or the SDD engine.

## Product Manager example

A Product Manager starts with a rough request: “Give account owners a clear
view of tenant health.” They can write a concise outcome themselves and
continue immediately. If an approved local connector has a planning agent,
they may explicitly request read-only enrichment. The agent receives the
supplied source only; it does not require the PM to clone the product
repository or install development dependencies.

The agent can suggest:

- target users and their decision to make;
- measurable success signals;
- likely scope boundaries and non-goals;
- acceptance anchors; and
- questions that must be answered before delivery.

Studio then keeps the proposed outcome separate from the accepted Product
brief. The PM reviews it, corrects it, accepts it, or discards it. Only the
accepted brief becomes reusable context for the Business Analyst, Security
Researcher, Developer/Architect, and delivery-engine stages that are allowed
to consume it.

This is the practical difference from simply asking Copilot to draft a story:
the draft is not merely generated; it is attached to a delivery boundary,
reviewed, and made available to the next role without relying on a copied
prompt or an undocumented chat decision.

## How persona handoffs work

Every persona workflow ends at the same **accepted handoff** stage. It appears
only after the artifact passes its applicable validation and a person accepts
it. The stage uses the same declared artifact-consumption policy that Studio
uses downstream, rather than a separate UI-only recipient list.

| Persona | Accepted artifact | Permitted consumers | Safe next action |
| --- | --- | --- | --- |
| Product Manager | Product Brief | Business Analyst, Security Researcher, Developer/Architect, and the configured SDD engine | Hand off to Developer/Architect or download the Markdown packet. |
| Business Analyst | Business Analysis | Product Manager, Security Researcher, Developer/Architect, and the configured SDD engine | Continue to delivery planning or download the Markdown packet. |
| Developer/Architect | Technical Decision | Product Manager, Security Researcher, and the configured SDD engine | Continue to delivery planning or download the Markdown packet. |
| Security Researcher | Security Review | Product Manager, Developer/Architect, and the configured SDD engine | Continue to delivery planning or download the Markdown packet. |

Each completion stage shows who may consume the artifact, a concise contents
summary, its repository boundary, a collapsible read-only view of the accepted
Markdown, and one primary next action. It also names the selected SDD engine
and version, then lists the exact engine-owned projection path (for example,
the required `spec.md` or `plan.md`). An accepted package is shown as compliant
only when that selected engine has a verified adapter and the projection passed
its contract validation. Downloading is portable and does not change Studio, a
repository, or an approval state. A recipient sees the artifact automatically
only when its declared consumption rule permits it.

Repository publishing remains a deliberate Developer/Architect action. A
handoff never grants a Git write, code execution, compliance certification, or
release authority.

### Resuming another person's handoff

The **Download resumable handoff** action produces a bounded Studio ZIP. It
contains the accepted persona artifact, its engine projection, and a versioned
manifest; it deliberately excludes repository files, tokens, local-agent
configuration, and execution receipts. A Developer/Architect can select
**Import Studio handoff** before connecting a repository. Studio verifies that
the archive targets the currently selected supported engine and version, checks
the contained projection against that engine contract, restores it to the
matching feature (or creates that feature), and selects it for the next stage.

The ZIP may also be unpacked and its `studio-persona-handoff.json` manifest
imported directly. Studio does not treat a random Markdown file, a copied
prompt, or an arbitrary ZIP as workflow state; those cannot safely establish
an accepted handoff. Repository connection is still deferred until technical
work genuinely needs codebase evidence.

### When the Product Manager workflow ends

The Product Manager workflow ends when the Product Brief is accepted. Studio
then displays a completed handoff with the intended recipients, contents, and
an expanded file tree. The PM can download a resumable Studio ZIP or choose
**Hand off to Developer / Architect**. The latter keeps the accepted product
context inside Studio, where declared downstream personas consume it
automatically.

Repository publishing is deliberately a Developer action: after the reviewed
implementation is committed and pushed from its linked worktree, the completed
developer handoff may explicitly create a GitHub PR through the developer's
local `gh` session. Studio records PR details in delivery evidence; it never
creates the commit, pushes the branch, merges, or deploys. A Product Manager
never needs repository access to complete or share the product handoff.

## Why Studio matters when work crosses roles

The value is not that Studio generates better prose than every agent. The
value is that it makes the *use of that prose* explicit and reviewable.

| Risk in an agent-only workflow | Studio control | Practical result |
| --- | --- | --- |
| A later role receives an outdated or incomplete summary. | Accepted artifacts are feature-scoped and source-labelled. | The recipient can see what was accepted and where it came from. |
| A security or technical concern is lost between chats. | Persona artifacts remain visible input to their declared consumers. | Constraints can be carried into planning without claiming they are automatically resolved. |
| An implementation agent receives broad or unclear instructions. | The Feature Journey binds work to scope, approved tasks, and an isolated worktree. | Less risk of accidental work in the primary checkout; a reviewer has a bounded receipt to inspect. |
| A team cannot reconstruct why an approach changed. | Studio retains decision artifacts, acceptance state, and implementation evidence. | A later reviewer has a starting record instead of relying only on chat history. |
| An agent result is mistaken for approval. | Acceptance and consequential connector actions require explicit human action. | Authority stays visible and auditable. |

## Using Studio and Copilot together

1. Use Copilot or another agent for quick personal exploration when no shared
   delivery decision exists yet.
2. Move the decision into the relevant Studio persona when it needs a clear
   owner, scope, acceptance, or handoff.
3. Review and accept the persona artifact before relying on it downstream.
4. Use the Feature Journey to turn accepted context into design, tasks, and
   guarded implementation work.
5. Use an installed local agent through Studio only when the task, worktree,
   and confirmation requirements are ready.

GitHub Copilot can remain the coding agent selected for local work. Studio
does not require a single provider; it provides the reviewable workflow around
the provider.

## Understanding actions before choosing one

Studio uses the same **What will happen?** Action Brief for consequential
persona, intake, and Journey actions. The one-line result stays visible; the
expanded view lists what Studio creates, uses, does not do, and what happens
next. This works through click, tap, and keyboard interaction rather than
placing essential instructions in a hover tooltip.

## Related guides

- [Personas](personas.md)
- [Persona artifact consumption](persona-artifact-consumption.md)
- [Developer/Architect workspace](developer-architect-persona.md)
- [Feature Journey](feature-journey-engine-first.md)
- [Local connector](local-connector.md)
