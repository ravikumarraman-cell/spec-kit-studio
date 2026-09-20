# Local Connector

The local connector turns Spec-Kit Studio from a documentation-only web application into a safe bridge to a local or private repository. It runs on loopback only, does not send repository content to the Studio server, and is preview-first for every filesystem write.

## Start it

From the Studio repository:

```bash
STUDIO_ALLOWED_ROOTS=/absolute/path/to/your/repos npm run connector
```

Optional hardening:

```bash
STUDIO_ALLOWED_ROOTS=/absolute/path/to/your/repos \
STUDIO_CONNECTOR_TOKEN=choose-a-long-random-value \
STUDIO_ALLOWED_ORIGINS=https://your-studio.example.com \
npm run connector
```

Enter the connector URL, repository path, and—when configured—the token in **Connected Workspace**.

For ChatGPT-authenticated Codex, the connector uses `gpt-5.6-luna` for non-interactive work packets by default. Set `STUDIO_CODEX_MODEL` only when your account has a different supported Codex model.

For your repository layout, set `STUDIO_ALLOWED_ROOTS` to `/Users/rraviku2/develop`. Then restart the connector; `/Users/rraviku2/develop/cloud-asset-inventory` will be within the permitted boundary.

## Safety model

- Binds to `127.0.0.1` only.
- Allows browser requests only from explicit local development origins by default. Add the deployed Studio origin with `STUDIO_ALLOWED_ORIGINS` when using a hosted web app.
- Rejects a repository path outside `STUDIO_ALLOWED_ROOTS`.
- Ignores common large/generated directories while scanning.
- Uses an allowlist for command execution: typecheck, test, build, Git status, and read-only `specify` status checks.
- Shows all generated file changes before writing.
- Requires an explicit UI confirmation and `APPLY` request before writing.
- Writes Studio assets only beneath `.specify/studio/`, so it does not overwrite official Spec-Kit templates or feature folders.

## What the connector provides

1. **Truth layer:** deterministic file inventory, manifest evidence, dependency versions, Git state, and Spec-Kit detection.
2. **Official CLI integration:** detects `specify version`, runs its read-only self-check, and can install `uv` in the connector's isolated `connector/.tools/` environment after explicit confirmation. It then installs the official `specify-cli` and initializes a fresh repository only after you select an integration and explicitly confirm. Homebrew and the system Python environment are never modified by this path. See [Spec-Kit’s installation guide](https://github.com/github/spec-kit/blob/main/docs/installation.md).
3. **Git-aware review:** branch and worktree status are displayed before export; generated changes are previewed before apply.
4. **Deterministic quality gates:** checks requirement/task/dependency traceability before AI review, then runs allowed repository verification commands.
5. **Execution evidence:** captures each verification command’s output for the feature workspace session.
6. **Portable prompts:** exports task-scoped implementation contracts for Copilot, Codex, Claude, Gemini, and Cursor.

This connector deliberately does not create branches, commit, push, or execute arbitrary shell commands. Official Spec-Kit initialization is the sole write outside `.specify/studio/`; it is limited to a repository with no existing `.specify/` directory, requires an installed official CLI, an integration selection, and explicit confirmation.
