# Spec-Kit Studio architecture

The Studio is organized around narrow, replaceable boundaries:

| Layer | Responsibility | Examples |
| --- | --- | --- |
| `app/` | Compose providers and route workspace screens | `AppProviders`, `WorkspaceView` |
| `components/` | Present information and emit user intent through props | `workspace`, `spec`, `tasks`, `project` |
| `hooks/` | Coordinate view state and application use cases | `useProjectWorkspace` |
| `lib/` | Framework-independent services, factories, and transformations | `storage`, `projectFactory`, `export`, `connector` |
| `types/` | Shared domain contracts | `speckit.ts` |
| `connector/` | Loopback-only local repository integration | `server.mjs` |
| `server/` | Configure HTTP policy, routes, telemetry, and lifecycle | `app`, `bootstrap`, `middleware` |

## Extension rules

1. Add a feature screen in its own `components/<feature>/` folder. Keep it focused on rendering and user interactions.
2. Put cross-screen project operations in a hook. Screens must not import `storageService` directly.
3. Put construction, normalization, and conversion logic in a pure `lib/` module. Pure functions are the preferred unit-test boundary.
4. Use the contracts in `types/speckit.ts`; avoid `any` at application boundaries. Validate untrusted API data before it reaches UI state.
5. Connector actions must remain explicit, allowlisted, and independently restartable from the web UI.

`App.tsx` owns the shell and global dialogs. `WorkspaceView` owns screen selection and feature-flow coordination. Screen-to-shell communication uses typed callbacks; components must not communicate through global browser events.

## Project data flow

```text
Screen event → hook use case → storage service → IndexedDB
                         ↓
                    SpecKitProject contract
```

`useProjectWorkspace` is the single app-level adapter for the project aggregate. The storage service hydrates its in-memory cache from IndexedDB and performs a one-time migration from the legacy localStorage project payload only after IndexedDB has committed it. It falls back to localStorage only when IndexedDB is unavailable. This boundary still allows a future cloud-backed repository without rewriting every screen. The aggregate also carries optional repository identity, stack-profile, feature identity, worktree, and governance metadata so legacy projects remain compatible.

## HTTP lifecycle

```text
request -> security headers -> request ID -> telemetry -> JSON parser -> API routes
                                                         | no API match
                                                         v
                                                    typed 404 error
request -> frontend static/Vite middleware -> terminal 404 -> error envelope
```

`createApplication` configures policy and API routes. The standalone bootstrap then mounts Vite or production static files before `finalizeApplication` installs terminal handlers. The Vercel entrypoint finalizes the API app directly. Keep this order intact so unknown API routes return JSON while client-side routes still reach the SPA.

All server failures use a stable `{ success, error, code, requestId }` envelope. Internal details are logged with the request ID and are not returned to clients. Browser API failures become `StudioApiError` values with status, code, request ID, retry classification, and cause.
