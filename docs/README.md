# Documentation

These are the current, task-oriented guides. They describe implemented
behavior and explicit boundaries; future design notes and duplicate setup
instructions are intentionally excluded.

## Use Studio

| Need | Guide |
| --- | --- |
| Understand product claims, guardrails, limits, and measurement | [Delivery workflow](delivery-experience.md) |
| Understand the review workflow | [Feature Journey](feature-journey-engine-first.md) |
| Decide where rules, architectural decisions, source documents, and grounding evidence belong | [Governance and architecture evidence policy](governance-and-architecture-evidence-policy.md) |
| Add a feature to an existing repository | [Adding features](adding_features_to_existing.md) |
| Work on concurrent features safely | [Feature isolation](feature-isolation-user-guide.md) |
| Repair a delivery that misses its intended outcome | [Outcome Refinery](outcome-refinery.md) |
| Connect a local repository, agent, or hosted Studio site | [Local connector](local-connector.md) |
| Choose or extend an SDD engine | [SDD engine adapters](sdd-engine-adapters.md) |
| Choose a focused role and understand its handoff | [Personas](personas.md) |
| Decide when to use a persona, a local agent, or both | [Personas, agents, and Studio](personas-and-agents.md) |
| Prepare a technical decision and developer handoff | [Developer/Architect](developer-architect-persona.md) |
| Review a completed developer handoff or publish its already-pushed branch | [Feature Journey](feature-journey-engine-first.md) |
| Understand which accepted persona artifacts can be reused | [Persona artifact consumption](persona-artifact-consumption.md) |
| Understand the available engine contract | [Engine deliverable contract](engine-deliverable-contract.md) |

## Deploy and maintain

| Need | Guide |
| --- | --- |
| Understand source boundaries | [Architecture](architecture.md) |
| Maintain modularity, accessibility, and interaction consistency | [Architecture and usability guardrails](architecture-quality.md) |
| Configure enterprise GitHub and OIDC | [GitHub Enterprise SSO/OIDC](github-sso-oidc-setup.md) |
| Package and operate a production service | [Production deployment](production-deployment.md) |
| Deploy into GovCloud or DoD boundaries | [Regulated deployment](regulated-deployment.md) |
| Plan a FedRAMP High authorization-readiness implementation | [FedRAMP High readiness](fedramp-high-readiness.md) |
| Prepare a public release | [Open-source readiness](open-source-readiness.md) |
| Mirror audited Studio source into Cloud Asset Inventory | [Repository mirroring](repository-mirroring.md) |

For product scope, security boundaries, and the verification command, start
with the repository [README](../README.md).
