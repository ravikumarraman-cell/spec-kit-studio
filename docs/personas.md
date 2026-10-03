# Personas

Studio personas are focused, reviewable workspaces that prepare accepted,
feature-scoped evidence for the delivery workflow rather than replacing
engineering review. Their artifacts can be reused only through the declared
[consumption policy](persona-artifact-consumption.md).

Every persona follows the same boundary: an accepted handoff records the
sender's completed work, and **Done** closes only that sender's workflow. It
does not begin a receiving role’s work. Once a receiving role starts the
shared Feature Journey, the persona remains read-only handoff context while
the Journey becomes the only active delivery route. This is the same rule for
every current and future persona.

## Available now: Product Manager

The Product Manager workspace produces a reviewable **Product brief**:

- problem, target users, and desired outcome;
- in-scope and explicitly out-of-scope work;
- acceptance anchors and success measures;
- decisions made, open questions, and evidence links; and
- a handoff that can enter the Feature Journey for engineering review.

The persona does not approve implementation, require a repository clone, run
tests, bypass repository connection, or write source code. A human reviews the
package before it becomes delivery scope. At completion, the Product Manager
can inspect the resumable handoff tree and download the accepted product
evidence for a Developer/Architect to consume.

## Available now: Developer/Architect

The Developer/Architect workspace guides a technical owner from an existing
feature or one existing user story to a reviewable **Technical decision
package**, then makes that accepted handoff available in the Feature Journey.
It supports a local-first, manually prepared package with explicit scope,
change surface, guardrails, and verification evidence. See the
[Developer/Architect guide](developer-architect-persona.md).

Technical ownership can be declared as **Architect / Tech Lead**,
**Developer**, or **Architect + Developer**. The Architect/Tech Lead handoff
occurs only after the shared Stage 4 architecture plan is approved; Developers
then resume at the earliest unfinished delivery stage, normally Stage 5.

It does not automate repository inspection, architecture approval, or
implementation. An Architect/Tech Lead can stop after an accepted Stage 4
architecture plan and hand that package to a Developer, who resumes from the
first unfinished technical stage rather than repeating product discovery.
Future optional enrichments must remain policy-gated and read-only.

## Available now: Business Analyst and Security Researcher

The Business Analyst workspace produces a **Business analysis package** with
the business problem, scope, acceptance evidence, assumptions, and open
questions. The Security Researcher workspace produces a **Security research
package** with a bounded security boundary, required controls, verification
evidence, findings, and mitigations. Both are local-first and advisory:
neither scans repositories, changes code, approves delivery, or claims a
compliance assessment.

## Future personas

Design remains future work. A new persona needs a typed artifact adapter,
declared consumption rules, a clear handoff to the shared workflow, and tests
that prevent an advisory result from being treated as implementation approval.
