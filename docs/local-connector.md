# Local connector

The optional connector bridges Studio to repositories on the same computer. It
binds only to loopback; it is not a network service, remote-repository proxy,
or provider credential store. A hosted Studio site does not gain access to a
computer unless its browser is paired with this locally configured process.

## Install

For a hosted Studio site, use **Connected Workspace → Install the local
connector** and install the versioned package shown there:

```bash
npm install --global https://studio.example.com/downloads/spec-kit-studio-local-connector-0.1.20.tgz
```

Replace the example origin with the exact Studio origin. Install only an
organization-controlled package or an artifact from a Studio release.
Contributors can instead run the connector from this repository with
`npm run connector`.

## Configure a narrow production boundary

Create a private configuration folder, generate a long random token, and keep
the repository clones and worktrees below one narrow parent directory. Do not
authorize a home directory, `/`, or a shared broad folder.

macOS and Linux:

```bash
mkdir -p "$HOME/.spec-kit-studio-connector"
cd "$HOME/.spec-kit-studio-connector"
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Windows PowerShell:

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.spec-kit-studio-connector"
Set-Location "$env:USERPROFILE\.spec-kit-studio-connector"
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Create `.env.local` in that folder. Use forward slashes in Windows paths:

```env
STUDIO_CONNECTOR_MODE=production
STUDIO_ALLOWED_ROOTS="/absolute/path/to/studio-repositories"
STUDIO_ALLOWED_ORIGINS="https://studio.example.com"
STUDIO_CONNECTOR_TOKEN="paste-a-random-token-of-at-least-32-bytes"
```

Windows example:

```env
STUDIO_ALLOWED_ROOTS="C:/Users/your-name/studio-repositories"
```

`STUDIO_ALLOWED_ROOTS` must be absolute. `STUDIO_ALLOWED_ORIGINS` must be an
exact HTTPS origin, with no path, wildcard, or credentials. Never commit,
upload, or place this file in hosted environment variables.

Start the connector and pair it in **Connected Workspace** with
`http://localhost:4318`, the same token, and an absolute repository path below
the allowed root. The scan is read-only.

```bash
spec-kit-studio-connector
```

For a repository checkout, the equivalent is:

```bash
STUDIO_ALLOWED_ROOTS=/absolute/path/to/studio-repositories npm run connector
```

## Hosted Studio and local agents

The Studio website, optional hosted API, local repository, and local agent are
separate boundaries. Keep `STUDIO_CONNECTOR_TOKEN`, `STUDIO_ALLOWED_ROOTS`,
and CLI sign-in on the computer running the connector. Do not put them in
Vercel, Git, browser forms, screenshots, or tickets.

The connector launches a locally installed Codex, Claude Code, Copilot CLI, or
an administrator-declared adapter. It never accepts a browser-provided
executable, command line, install URL, or provider API key. Provider usage
belongs to the account signed in to that local CLI.

By default, connector-started Codex ignores user-level Codex configuration to
avoid unrelated plugins and skills being injected into work packets. Set
`STUDIO_CODEX_IGNORE_USER_CONFIG=false` only for a deliberate, trusted local
customization. If using a non-default Codex home, set `STUDIO_CODEX_HOME` to
its absolute path explicitly.

## What the connector can do

- Read bounded repository, Git, tool, and Spec-Kit evidence.
- Preview/apply bounded workspace changes, create linked worktrees, and run
  declared verification commands after explicit confirmations.
- Install or initialize the verified GitHub Spec Kit workflow only after a
  separate explicit confirmation.
- Run an approved local agent after preflight; implementation runs require a
  registered linked worktree.
- Create a GitHub pull request at the completed developer handoff only after
  the developer explicitly confirms it, using their existing local `gh`
  session and an already committed, pushed, clean linked-worktree branch.

It never auto-commits, pushes, merges, deploys, or approves a result. PR
publication is optional and is not a replacement for repository review. Studio
records the created PR details in the delivery-evidence handoff; it does not
put provider credentials in a package.

## Regulated mode

For a GovCloud or DoD workflow, set the same `STUDIO_DEPLOYMENT_MODE` as the
hosted application and add:

```env
STUDIO_CONNECTOR_EXTERNAL_AGENT_EGRESS=disabled
```

The connector then requires production pairing/root/origin controls and blocks
cloud coding-agent handoffs. Its health response reports the same regulated
mode so Studio diagnostics can remain consistent. Do not relax this for a
public SaaS agent; enable only a reviewed, in-boundary adapter. See [regulated deployment](regulated-deployment.md).

## Troubleshooting and updates

| Problem | Action |
| --- | --- |
| Studio cannot connect | Confirm the connector is running and use `http://localhost:4318`. |
| Token rejected | Copy the exact value from `.env.local`; Studio retains it only for the current browser session. |
| Repository outside allowed roots | Move it below the narrow configured root or deliberately update private configuration and restart. |
| No agent is shown | Install/sign in to that CLI, restart the connector, then rescan. |
| A newer connector is required | Install the displayed release, restart it, then refresh Studio. |
| PR creation is unavailable | Commit and push the clean linked-worktree branch, select the correct base branch, and run `gh auth login` for the repository before retrying. |

Stop with `Ctrl+C`. Never expose the connector on a LAN to work around a
browser limitation.
