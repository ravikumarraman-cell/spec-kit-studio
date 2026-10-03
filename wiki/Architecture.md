# Architecture

Spec-Kit Studio is organized around narrow boundaries so storage, repository access, AI providers, and UI workflows can evolve independently.

## Components

| Layer | Responsibility |
| --- | --- |
| `src/app` | Providers and route-level workspace composition |
| `src/components` | Presentation and typed user intent |
| `src/hooks` | View state and application use cases |
| `src/lib` | Framework-independent services and transformations |
| `src/types` | Shared domain contracts |
| `connector` | Loopback-only repository and local-agent integration |
| `server` | HTTP policy, routes, telemetry, lifecycle, and safe public deployment context |

## Data flow

```text
screen event -> hook use case -> storage service -> IndexedDB
                         |
                         +-> SpecKitProject contract
```

`useProjectWorkspace` is the app-level adapter for the project aggregate. IndexedDB is the primary browser store, with a bounded migration and fallback path for older localStorage data.

## HTTP lifecycle

```text
request -> security headers -> request ID -> telemetry -> JSON parser -> API routes
                                                         | no API match
                                                         v
                                                    typed 404 error
request -> frontend middleware -> terminal 404 -> stable error envelope
```

Unknown API routes remain JSON while client-side routes still reach the SPA. Internal server errors are logged with request IDs and are not returned to clients.

## Extension principles

1. Keep feature screens inside their own component folder.
2. Put cross-screen operations in hooks rather than importing storage directly.
3. Keep normalization and transformations in pure library modules.
4. Validate untrusted data at application boundaries.
5. Keep connector actions explicit, allowlisted, and independently restartable.
6. Derive any GovCloud or DoD label from the server's public deployment context;
   do not duplicate or infer regulated status per screen.

## Canonical references

- [Detailed architecture](https://github.com/rraviku2_uhg/spec-kit-studio/blob/main/docs/architecture.md)
- [Server source](https://github.com/rraviku2_uhg/spec-kit-studio/tree/main/server)
- [Connector source](https://github.com/rraviku2_uhg/spec-kit-studio/tree/main/connector)
- [Shared domain contracts](https://github.com/rraviku2_uhg/spec-kit-studio/tree/main/src/types)

---

[Project site](https://rraviku2-uhg.github.io/spec-kit-studio/) · [[Home]] · [[Delivery Workflow]] · [[Security and Trust]]
