# Persona artifact consumption

Persona artifacts are feature-owned, read-only inputs. They are consumable only after a human accepts them, and only by the roles listed below. Consumption adds context; it never overwrites the source artifact, changes code, grants connector access, or substitutes for a human approval.

| Consumer | Valid accepted inputs | How Studio uses them |
| --- | --- | --- |
| Product Manager | Business analysis; security research; technical decision | Revisit outcome boundaries and trade-offs without changing an existing technical approval. |
| Business Analyst | Product outcome | Turn the approved outcome into explicit scope and acceptance evidence. |
| Security Researcher | Product outcome; business analysis; technical decision | Assess the intended outcome, clarified scope, and proposed technical boundaries. |
| Developer / Architect | Product outcome; business analysis; security research | Design against approved outcomes, acceptance evidence, and required controls. |
| SDD Engine stages | Product outcome; business analysis; technical decision; security research | Supply bounded, source-labelled reviewed inputs to planning and implementation prompts. |

The policy lives in `src/lib/personas/consumption.ts`. `availablePersonaInputs` resolves only accepted, feature-scoped artifacts for a consumer. `personaConsumptionPacket` creates the bounded, source-labelled context used by the Engine; it is the shared integration point for future persona screens, connectors, and engine adapters.

An unavailable or unaccepted artifact is never injected. A role may continue without optional upstream inputs, but Studio makes the available reviewed inputs visible on that role’s screen.
