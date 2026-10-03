# Studio Home experience

## Decision

The Studio landing view is **Home**: a state-aware operational workspace, not a marketing page and not a generic metrics dashboard. Its job is to make the next defensible action obvious while preserving truthful repository, workflow, agent, and evidence state.

The internal implementation may retain the `WorkspaceHub` name. User-facing navigation should use **Home**.

## Product principles

1. **One dominant action.** Every state presents one visually primary next action.
2. **Outcome before role.** New work starts from what the user wants to produce; the responsible persona is supporting context.
3. **Resume before restart.** Existing work always outranks new-work entry points.
4. **Truth before decoration.** Readiness, runs, evidence, and audit state come from retained or live data. Unknown remains unknown; stale remains stale.
5. **Progressive disclosure.** Readiness details and evidence metrics remain available without competing with the next action.
6. **No dead ends.** Every warning and empty state names the recovery action.
7. **Local-first clarity.** Repository requirements, connector freshness, and artifact provenance are explicit.

## Design references

The design borrows interaction patterns from five familiar products:

- **Linear:** rank urgent, blocked, active, and recent work rather than showing a flat list.
- **Notion:** preserve continuity through recent work and selectively disclosed home sections.
- **GitHub:** keep workspace context and keyboard-first search globally available.
- **Vercel:** present operational status beside the project action it affects.
- **Figma:** frame work from incomplete idea to shipped artifact with shared context.

These are design references, not claims of formal research validation or
endorsement by those products. Studio applies the patterns to
specification-driven delivery without copying their visual systems.

## State model

Home derives its sections from the existing dashboard view model and live connector observer. Components receive typed values and navigation callbacks; they do not infer workflow truth independently.

### 1. New workspace

Dominant region: **Choose an outcome**.

Each choice states:

- the intended outcome;
- the responsible persona;
- the artifacts Studio will produce;
- whether repository evidence is required.

Choices:

| Outcome | Persona | Produces | Repository |
| --- | --- | --- | --- |
| Define a product outcome | Product Manager | Feature brief, user stories, success measures | Not required |
| Clarify a business need | Business Analyst | Scoped requirements, acceptance evidence | Not required |
| Plan a technical change | Developer / Architect | Repository-grounded architecture and delivery plan | Required before technical evidence |
| Assess security and risk | Security Researcher | Findings, evidence, remediation guidance | Required before repository findings |

Repository setup appears as truthful readiness context, not as a competing primary action.

### 2. Persona draft in progress

Dominant region: **Continue the selected outcome**.

Show the persona label, retained feature context, exact next action, and a secondary option to choose another outcome. Changing routes must not delete drafts.

### 3. Active delivery

Dominant region: **Continue the current stage**.

Show:

- active delivery title and scope;
- current stage and total stages;
- one stage-specific action;
- journey map;
- active or recently completed connector run;
- up to three recent delivery items;
- readiness and evidence details behind disclosures.

### 4. Blocked or stale

The primary action remains the workflow action unless the blocker prevents it. Status text must distinguish unavailable, checking, ready, stale, running, waiting for review, stopped, failed, and complete. Never translate cached state into live readiness.

### 5. Completed delivery

Dominant region: **Review or download the handoff**.

The journey map and retained evidence remain visible. New-work entry is secondary.

## Information hierarchy

1. Compact workspace context: workspace, repository, connector truth.
2. One dominant action: start, resume, continue, recover, or hand off.
3. Journey/run context when work exists.
4. Recent delivery queue.
5. Collapsed readiness and evidence details.

Global search stays in the application header. Home does not duplicate it.

## Visual and interaction contract

- Use semantic theme tokens; no component-specific hard-coded light/dark palette.
- Use broad operational regions, not nested decorative cards.
- Reserve success color for verified completion and warning color for actionable attention.
- Motion communicates live work only and honors reduced-motion preferences.
- Every action has visible keyboard focus and a minimum 44px touch target.
- The compact viewport keeps the dominant action before supporting sections.
- Empty metrics are omitted or explicitly shown as `Not run`; no default scores or inferred percentages.

## Extensibility

New outcomes are data entries in the outcome-choice catalog. New supporting sections consume `DashboardViewModel` fields or an explicit runtime observer. They must not read storage, start agents, or mutate journey state during render.

A future section is eligible for Home only when it answers one of these questions:

- What should I do next?
- What is currently running or blocked?
- What recent work can I resume?
- What verified evidence supports this state?

Otherwise it belongs in its owning workspace view, not Home.

## Acceptance criteria

- A new user can explain every starting choice and repository prerequisite without opening another screen.
- A returning user can resume active work with one action.
- Only one primary action is visually dominant.
- Active run, journey, queue, readiness, and evidence sections render only when applicable.
- Status labels are source-derived and communicate freshness.
- Home fits compact mobile through desktop without horizontal overflow.
- Keyboard and screen-reader users can identify the page, dominant action, section headings, and status changes.
