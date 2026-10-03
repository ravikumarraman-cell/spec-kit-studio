# Developer/Architect workspace

The Developer/Architect workspace turns accepted delivery context into a
reviewable technical decision package. It is available now as a local-first,
human-authored workflow. It complements the Feature Journey; it does not
inspect a repository automatically, write code, create a branch, launch an
agent, approve a design, or approve a release.

## When to use it

Use it after a repository has been connected and a feature or independently
deliverable story has been selected. It is especially useful when a technical
owner needs to make constraints, risks, interfaces, and verification
expectations clear before delivery planning.

The workspace can consume accepted Product Manager, Business Analyst, and
Security Researcher artifacts as read-only context. It makes their source and
acceptance status visible; it never silently changes them. See [persona
artifact consumption](persona-artifact-consumption.md).

## The shortest useful path

1. **Confirm the delivery boundary.** Work from the selected feature or one
   selected story and its in-scope requirements.
2. **Record the decision.** Capture the change surface, constraints,
   considered options, chosen approach, risks, and open questions.
3. **Define proof.** State the verification, compatibility, rollout, or
   rollback evidence appropriate to the change.
4. **Review and accept.** Accepting produces a feature-scoped technical
   decision package; it remains advisory evidence, not an implementation
   approval.
5. **Continue in the Feature Journey.** Use the accepted package during
   design and task planning. Implementation still follows the guarded
   worktree and human-review flow.

## Architect and developer handoff

Studio supports a team in which the Architect/Tech Lead and Developer are
different people by keeping responsibilities explicit rather than creating two
competing plans.

At the beginning of technical work, Studio records one of three ownership
choices on the delivery item: **Architect / Tech Lead**, **Developer**, or
**Architect + Developer**. This is workflow context, not an authorization
setting, and existing workspaces default safely to the combined choice.

| Technical owner | Developer |
| --- | --- |
| Defines the decision, constraints, non-goals, risks, and proof expectations. | Plans and implements through the Feature Journey, preserving those constraints. |
| Reviews a clarification or deviation when repository evidence conflicts with the decision. | Records a clarification or deviation instead of silently changing the decision. |
| Does not treat the package as proof that implementation is correct. | Produces task receipts and verification evidence; does not self-approve the architecture. |

The current role labels clarify accountability. They are not identity or
authorization controls; use enterprise authorization for that concern.

### The explicit boundary

An Architect/Tech Lead stops at the accepted **Stage 4: Design safely**
architecture plan. Studio then exposes one architecture handoff instead of
leaving the developer to infer what is complete. It contains the accepted
technical decision and GitHub Spec Kit `plan.md` projection, plus accepted
impact-map and security context when present. The download is a resumable ZIP;
its visible tree lists every included file.

A Developer consuming the handoff in the same workspace continues at the
earliest unfinished stage—normally **Stage 5: Plan delivery**. They do not
repeat product discovery or architecture approval. The handoff screen always
shows **What will be delivered**, then offers explicit actions to finish the
Architect flow and return Home, download the architecture ZIP, start as the
receiving Developer, or continue as the same Architect + Developer.

An architecture ZIP exported after Stages 1–4 are accepted carries bounded
copies of the accepted specification, impact map, and architecture plan. On
import, Studio validates those files against the manifest and credits only
Stages 2–4. The receiving workspace must still connect and baseline its target
repository at Stage 1; after that, it proceeds directly to **Stage 5: Plan
delivery**. Studio never treats a ZIP as permission to write code or skip the
Stage 6 quality review.

The combined option removes the ceremony for a single technical owner but
retains the same Stage 4 architecture, Stage 6 quality, and Stage 8 handoff
review boundaries.

## Completed developer delivery

At Stage 8, Studio presents a distinct developer delivery handoff rather than
repeating upstream product or architecture cards. It clearly separates:

- the strict engine handoff (`spec.md`, `plan.md`, and `tasks.md`);
- Studio delivery evidence (manifest, reviewed receipts, and CI/PR template);
  and
- application code, which remains on the linked feature branch.

After the developer has committed and pushed a clean linked-worktree branch,
they may explicitly create a GitHub pull request from this handoff. Studio
uses the developer's existing local `gh` authentication, asks for a themed
confirmation, and records the resulting URL, number, title, branches, and
timestamp in the delivery-evidence package. It never creates a hidden commit,
pushes, merges, deploys, or approves the pull request.

## What the package contains

- delivery scope and linked requirements;
- change surface, assumptions, constraints, and non-goals;
- alternatives considered and the chosen approach;
- security, compatibility, operational, and delivery risks;
- verification, rollout, and rollback expectations where relevant; and
- open questions and source-labelled evidence.

For a small change, keep this concise. Studio should make a narrow decision
easy to review, not force an architecture ceremony.

## Important boundary

The decision package is a Studio companion artifact. When it is accepted,
Studio projects the relevant delivery content into the selected engine's
artifact contract. GitHub Spec Kit v1.0.6 is the only verified engine adapter
currently available. See the [engine deliverable contract](engine-deliverable-contract.md).
