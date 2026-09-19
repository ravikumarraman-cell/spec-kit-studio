# Maintainability program

Progress is deliberately sequential so behavior is verified before the next architectural change.

| # | Improvement | Status | Regression gate |
| --- | --- | --- | --- |
| 1 | Split server routes and services | Complete | Production build + endpoint inventory |
| 2 | Typed web API client and feature hooks | Complete | Client contract tests |
| 3 | Decompose import screens | Complete | Factory and preset regression tests |
| 4 | Extract header interaction hooks | Complete | Production type check + build |
| 5 | Lazy page registry | Complete | Production build chunk check |
| 6 | Validate API-boundary contracts | Complete | Invalid-payload tests |
| 7 | Comprehensive regression suite | Complete | `npm run verify` |

## Item 1 completed slices

- Gemini client creation is isolated in `server/services/geminiClient.ts`.
- Health and Spec-Kit vendor routes are isolated in `server/routes/`.
- Existing endpoint paths and response shapes are retained.

AI generation, repository analysis/import, integrations, prompt generation, audit, health, and Spec-Kit vendor endpoints now have dedicated route modules. `server.ts` is limited to application setup, middleware, route composition, and startup.

## Item 2 completed slices

- All application API calls now go through `src/lib/api/`; components no longer own fetch/error-envelope code.
- Import and integration API request/response contracts are explicit and shared by their callers.
- The connector remains separate because it uses its configured local-connector base URL and authentication header.

## Item 3 completed slices

- Feature extraction response-to-workspace construction is isolated in `src/lib/importProjectFactory.ts`.
- Repository-analysis normalization is isolated in `src/lib/repositoryImportFactory.ts`.
- Reusable import feedback is isolated in `src/components/import/ImportNotice.tsx`.
- Feature and repository sample data are isolated from UI components in their own preset modules.

## Item 4 completed slices

- Outside-click menu dismissal is isolated in `src/hooks/useClickOutside.ts`.
- Horizontal menu drag, wheel, resize, scrolling, and active-item centering are isolated in `src/hooks/useHorizontalScrollNavigation.ts`.

## Item 7 completed slices

- Regression tests cover portable prompts, workspace creation/export safety, API-envelope rejection, and feature-extraction project construction.
- Route inventory tests ensure the server split retains generation, repository, and integration endpoints.
- Repository import normalization and malformed API-field rejection are covered.

## Verification gate

Run `npm run verify` before merging. It performs static type checking, the repository regression tests, and a production build.
