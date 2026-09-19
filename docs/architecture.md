# Spec-Kit Studio architecture

The Studio is organized around narrow, replaceable boundaries:

| Layer | Responsibility | Examples |
| --- | --- | --- |
| `components/` | Present information and emit user intent through props | `workspace`, `spec`, `tasks`, `project` |
| `hooks/` | Coordinate view state and application use cases | `useProjectWorkspace` |
| `lib/` | Framework-independent services, factories, and transformations | `storage`, `projectFactory`, `export`, `connector` |
| `types/` | Shared domain contracts | `speckit.ts` |
| `connector/` | Loopback-only local repository integration | `server.mjs` |

## Extension rules

1. Add a feature screen in its own `components/<feature>/` folder. Keep it focused on rendering and user interactions.
2. Put cross-screen project operations in a hook. Screens must not import `storageService` directly.
3. Put construction, normalization, and conversion logic in a pure `lib/` module. Pure functions are the preferred unit-test boundary.
4. Use the contracts in `types/speckit.ts`; avoid `any` at application boundaries. Validate untrusted API data before it reaches UI state.
5. Connector actions must remain explicit, allowlisted, and independently restartable from the web UI.

## Project data flow

```text
Screen event → hook use case → storage service → localStorage
                         ↓
                    SpecKitProject contract
```

`useProjectWorkspace` is the single app-level adapter for the project aggregate. This lets a future API, IndexedDB, or cloud-backed repository replace the storage service without rewriting every screen.
