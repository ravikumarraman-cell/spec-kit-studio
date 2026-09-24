# Production-readiness implementation progress

This ledger records concrete evidence, not aspirational completion. It accompanies [the production deployment and user-owned agents architecture](production-deployment-and-user-owned-agents.md).

**Last updated:** 2026-09-24  
**Owner:** Spec-Kit Studio maintainers  
**Truth standard:** “Complete” means implemented in this repository and verified as stated. “Blocked” means it requires an external decision, service, credential, contract, or independent review.

## Current milestone: Phase 0 — local connector production hardening

| Item | Status | Evidence / next action |
| --- | --- | --- |
| Document the real current connector behavior and production target | Complete | [Production deployment and user-owned agents](production-deployment-and-user-owned-agents.md) distinguishes present capabilities from the Companion/control-plane target. |
| Explicit production configuration mode | Complete | `connector/productionConfig.mjs` adds `STUDIO_CONNECTOR_MODE=production`. |
| Fail closed without configured repository roots | Complete | Production mode rejects missing or non-absolute `STUDIO_ALLOWED_ROOTS`; it never falls back to the process working directory. |
| Fail closed without configured browser origins | Complete | Production mode requires explicit, exact HTTPS `STUDIO_ALLOWED_ORIGINS`; localhost defaults are development-only. |
| Pairing token requirement | Complete | Production mode requires `STUDIO_CONNECTOR_TOKEN` with at least 32 UTF-8 bytes. It remains a local pairing control, not user identity. |
| Connector production-policy tests | Complete | `tests/connectorProductionConfig.test.ts` covers development defaults and production rejection/acceptance paths. |
| Full repository verification after this change | Complete with environment note | `npm run verify` passed on 2026-09-24: 149 tests, TypeScript validation, and build. The local machine used Node 20.15.1; Vite emitted a warning because the repository declares Node 22.12+ as its supported runtime. Validate the release artifact on Node 22.12+ before deployment. |

## Implementation log

| Date | Change | Status | Verification |
| --- | --- | --- | --- |
| 2026-09-24 | Added the production architecture, billing model, security requirements, and rollout plan. | Complete | Documentation reviewed against the current connector code; no unimplemented capability is represented as available. |
| 2026-09-24 | Added connector production configuration parsing and fail-closed validation. | Complete | Focused automated tests added; full verification later completed in this ledger. |
| 2026-09-24 | Ran full verification after the connector and documentation changes. | Complete with environment note | `npm run verify` passed: 149/149 tests, lint, and build. The existing test suite intentionally emits expected error logs for negative-path tests. Vite warned that the local Node 20.15.1 is below the package's declared Node 22.12+ runtime. |
| 2026-09-24 | Added the layperson Vercel-to-local-connector deployment and pairing guide. | Complete | [Vercel-hosted Studio with local agents](vercel-local-connector-guide.md) documents deployment, local configuration, Studio pairing, billing boundaries, browser limitations, troubleshooting, and revocation. |
| 2026-09-24 | Removed private registry resolution URLs from the npm lockfile and added public-source deployment guardrails. | Complete | `.npmrc` pins the public npm registry; `npm run check:public-deps` rejects private registry, Git/SSH, filesystem, and workspace dependency sources; `npm run verify` passed under Node 22.19.0 with 149 tests and a production build. |

## Next milestone: Phase 1 — Studio Companion

| Item | Status | Why it is not marked complete |
| --- | --- | --- |
| Signed, installable Companion | Not started | Requires supported OS list, signing identities, distribution/update channel, and a dedicated application implementation. |
| Device enrollment and OS-keychain key storage | Not started | Requires Companion and a control-plane enrollment service. |
| Outbound control-plane connection | Not started | Requires hosted endpoint, protocol, tenancy, and operational ownership. |
| Local grant verification and per-action approval | Not started | Requires control-plane grant issuance and Companion implementation. |
| Device revocation and forced upgrades | Not started | Requires device registry, update channel, and support operations. |

## Future production gates

| Gate | Status | Blocking dependency |
| --- | --- | --- |
| Tenant-aware OIDC/SAML/SCIM and RBAC | Blocked | Identity provider, tenant model, cloud deployment, and authorization design approval. |
| Durable audit trail and job store | Blocked | Cloud database/storage selection, retention rules, and privacy/data classification decisions. |
| Signed, one-time action grants | Blocked | Control-plane issuer, key management, device enrollment, and Companion verifier. |
| User-owned local provider mode | Partially implemented | Current local connector launches a user's locally authenticated CLI, but it has no central device identity, grant, or billing-status UX. |
| Organization-paid worker/CI mode | Not started | Provider contracts/credentials, secrets manager, worker isolation, cost allocation, and policy design. |
| Security review and penetration testing | Not started | Independent assessor, deployed scope, threat model, and remediation process. |
| SLOs, observability, incident response, backup/restore | Not started | Production cloud architecture and named operational owner. |
| Privacy/legal/accessibility release review | Not started | Intended market, data classification, legal review, and test evidence. |

## Change-control rule

Do not change a row to **Complete** because a design exists, a mock is visible, or a local test passes. Link code, deployment evidence, test output, or approved review evidence. If a work item needs an owner decision, preserve that fact in this ledger rather than assuming the decision.
