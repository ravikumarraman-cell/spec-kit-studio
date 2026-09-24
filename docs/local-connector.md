# Local connector

The optional connector is a Node process that bridges Studio to repositories on the same machine. It listens on `127.0.0.1`; it is not a network service or a remote-repository proxy.

## Start it

```bash
STUDIO_ALLOWED_ROOTS=/absolute/path/to/your/repos npm run connector
```

For local-browser protection and a hosted Studio origin, configure:

```bash
STUDIO_ALLOWED_ROOTS=/absolute/path/to/your/repos \
STUDIO_CONNECTOR_TOKEN=choose-a-long-random-value \
STUDIO_ALLOWED_ORIGINS=https://your-studio.example.com \
npm run connector
```

Use the narrowest allowed parent directory that contains the repositories you intend to connect. Enter the connector URL, repository path, and token (when configured) in **Connected Workspace**.

## What it actually does

- Scans an allowed repository for a bounded inventory, manifests, Git evidence, Spec-Kit files, available baseline commands, and local-agent availability.
- Previews and applies browser-provided files only after an `APPLY` confirmation. Path traversal is rejected.
- Creates a linked Git worktree after a `CREATE_WORKTREE` confirmation and records the resulting path, branch, and baseline in Studio.
- Runs discovered baseline commands and an allowed feature verification command; it captures bounded job output.
- Runs Codex, Claude Code, or GitHub Copilot CLI only after an explicit execution confirmation and a feature preflight. Implementation requires a registered linked worktree.
- Can install `uv` into `connector/.tools/`, install `specify-cli`, and initialize a fresh Spec-Kit repository only through separate explicit confirmations.

## Boundaries and limitations

The connector limits repository paths to `STUDIO_ALLOWED_ROOTS`, restricts browser origins, and optionally requires `x-studio-token`. It exposes a small set of predefined operations, but it is still a local process with authority to write inside an allowed repository when the user confirms an action.

It does not automatically commit, push, create a pull request, or deploy. It cannot establish that an AI-generated plan or implementation is correct. Review diffs and run repository-appropriate verification.

Story-scoped implementation adds strict Spec-Kit conformance checks. It requires an initialized `.specify/` directory, Spec-Kit 1.0.11 or newer, a matching numbered branch, and complete conformant artifacts.
