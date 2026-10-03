# SDD engine adapters

Spec-Kit Studio owns the reviewable delivery workflow: scope, human approvals,
worktrees, receipts, exports, and handoff do not depend on a particular
specification tool. Each workspace records its selected SDD engine.

GitHub Spec Kit remains the default strict adapter because Studio's local
connector can currently verify its numbered `spec`, `plan`, and `tasks`
artifacts and operate its CLI safely.

OpenSpec, BMAD Method, Tessl, AWS Kiro, and Custom are artifact-first engine
profiles. They let a team select and retain its convention without rewriting
Studio project data or its review workflow. Import, review, planning context,
worktrees, and handoff remain available.

## Adding a CLI adapter

An engine-specific connector adapter must declare, rather than accept from the
browser:

1. its fixed executable and safe version command;
2. recognized artifact paths and the artifact roles they provide;
3. an explicit installation and initialization action, if supported;
4. validation rules for reviewable artifacts; and
5. the bounded agent-operation arguments it permits.

The browser must never submit an executable path, arbitrary shell arguments,
or an installation URL. Until an adapter is installed, Studio intentionally
does not claim it can install or run an external tool's CLI.

## Trusted external artifact manifests

Stage 4 supports a deliberately narrow extension path for future engines. A
machine owner may set `STUDIO_TRUSTED_SDD_ADAPTER_MANIFESTS_JSON` to an array
of declarative manifests, and must pin each manifest's canonical SHA-256 in
`STUDIO_TRUSTED_SDD_ADAPTER_DIGESTS` as `engine-id:sha256` pairs. The connector
rejects an unpinned, changed, duplicated, malformed, or unsafe manifest.

These manifests declare only repository-relative files for the `spec`, `plan`,
and `tasks` roles. They are artifact-read-only previews: no JavaScript,
commands, shell arguments, installation URL, or lifecycle capability is
accepted. They are not a production engine choice; a future Studio release
must ship and verify a dedicated adapter before it can enable lifecycle work.

## Distribution and migration

Each local connector release publishes
`public/downloads/sdd-adapter-distribution.json`. It states the connector and
adapter API versions, built-in adapters, and the constrained external-manifest
protocol. It is compatibility metadata only: Studio never downloads or executes
adapter code named by that file.

Projects and portable exports carry `sddEngine` plus
`sddEngineSchemaVersion`. Older or invalid selections migrate idempotently to
GitHub Spec Kit, preserving the only historical production behavior. A future
engine must be both known to Studio and verified by the local connector before
it becomes selectable.
