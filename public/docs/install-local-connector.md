# Install the local connector without cloning Studio

Use this guide when Studio is hosted on Vercel or another website but your repository and coding agent live on your own computer. You install one small local connector package; you do **not** need a Studio source checkout.

## What stays where

| Hosted Studio | Your computer |
| --- | --- |
| Workflow interface and saved Studio state | Repository clone and linked worktrees |
| Studio website address | Connector pairing token |
| Optional organization-hosted integrations | Codex, Claude Code, Copilot CLI, or another local agent login |

The connector listens only on `127.0.0.1`. It is not a remote-control tool, cloud proxy, or provider credential store. When it runs an agent, that agent uses the account already signed in locally; usage belongs to that account.

## Before you begin

You need Node `22.12` through `22.x`, a repository clone, and the exact HTTPS address of your Studio site (for example `https://studio.example.com`, without a trailing slash). Chrome or Edge on the same computer provides the most reliable hosted-site-to-loopback connection.

## 1. Download and install

In Studio, go to **Connected Workspace → Install the local connector** and select **Download the local connector package**. In a terminal, install it directly from your Studio site:

```bash
npm install --global https://studio.example.com/downloads/spec-kit-studio-local-connector-0.1.2.tgz
```

Replace `https://studio.example.com` with your exact Studio address. This downloads the standalone connector, not the Studio application source. If your organization later publishes the package to npm, it may give you the shorter equivalent:

```bash
npm install --global @spec-kit-studio/local-connector
```

Only use an organization-controlled package or the package downloaded from your Studio release.

When Studio shows a **connector update required** notice, install the release shown in **Connected Workspace** and restart the connector. The website checks connector capabilities before it asks a local agent to create an official `spec.md`, `plan.md`, or `tasks.md`; this prevents an older, read-only connector from reporting a successful run while leaving a template unchanged.

### Codex request isolation

By default, the connector runs non-interactive Codex with user-level Codex configuration ignored. This keeps unrelated personal plugins and skills from being added to Studio work packets, while preserving Codex sign-in and the connected repository's context. This is especially helpful when Codex reports that a request is too large.

Only add the following private `.env.local` setting when you intentionally need a trusted user-level Codex customization and understand that it can increase request context:

```env
STUDIO_CODEX_IGNORE_USER_CONFIG="false"
```

## 2. Choose a narrow local boundary

Create one parent folder that contains the repositories and linked worktrees Studio may access:

```text
/Users/your-name/studio-repositories/
├── cloud-asset-inventory/
└── worktrees/
    └── copy-tenant-id/
```

Do not authorize `/`, your whole home directory, or a broad shared folder unless you truly want the connector to access everything in it.

## 3. Create local-only settings

Create a private connector folder and open it in Terminal:

```bash
mkdir -p "$HOME/.spec-kit-studio-connector"
cd "$HOME/.spec-kit-studio-connector"
```

Generate a pairing token:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Create `.env.local` in that folder. Replace every sample value:

```env
STUDIO_CONNECTOR_MODE=production
STUDIO_ALLOWED_ROOTS="/Users/your-name/studio-repositories"
STUDIO_ALLOWED_ORIGINS="https://studio.example.com"
STUDIO_CONNECTOR_TOKEN="paste-the-long-random-value-here"
```

`STUDIO_ALLOWED_ROOTS` must be an absolute path. `STUDIO_ALLOWED_ORIGINS` must be the exact HTTPS Studio origin—no trailing slash, path, wildcard, or credentials. Never commit or upload this file, and never put these settings in Vercel environment variables. On Windows, use a private folder such as `%USERPROFILE%\\.spec-kit-studio-connector` and an absolute path such as `C:\\Users\\your-name\\studio-repositories`.

## 4. Start and verify

From the connector settings folder, run:

```bash
spec-kit-studio-connector
```

Leave this terminal open while you use Studio. A successful start prints:

```text
Spec-Kit Studio connector listening at http://127.0.0.1:4318
```

Open `http://127.0.0.1:4318/health` in the same browser. Healthy production output includes `"status":"ok"`, `"mode":"production"`, and `"tokenRequired":true`.

## 5. Pair the website

1. Open the hosted Studio site on the same computer.
2. Go to **Connected Workspace**.
3. Expand **Connection settings & diagnostics**.
4. Enter `http://127.0.0.1:4318`, the token from `STUDIO_CONNECTOR_TOKEN`, and an absolute repository path inside `STUDIO_ALLOWED_ROOTS`.
5. Choose **Scan repository**.

The scan is read-only. Studio discovers bounded repository evidence and locally available agent adapters before presenting any write or execution action.

## Local agents and billing

Select a detected agent in Studio settings. The connector launches that installed local CLI; it never accepts a browser-supplied executable or command line.

- Codex uses the account logged into local Codex CLI.
- Claude Code uses its local authenticated account.
- GitHub Copilot CLI uses its local GitHub identity and entitlement.
- Other CLIs can be added as safe, preconfigured adapters by the machine owner.

Studio never asks you to paste a provider API key. If an agent reports that it is signed out, sign in with that CLI’s normal process and scan again.

## Updating, stopping, and troubleshooting

To stop the connector, focus its terminal and press `Ctrl+C`. To update, download the newer package from the Studio release, reinstall it with the same `npm install --global …tgz` command, restart the connector, then refresh Studio.

| Problem | Resolution |
| --- | --- |
| Studio cannot connect | Ensure the connector terminal is running and use `http://127.0.0.1:4318`, not the hosted URL. |
| Token is required | Paste the exact token from `.env.local`; Studio retains it only for the current browser session. |
| Path is outside allowed roots | Move the repository/worktree below the configured narrow root, or deliberately update local configuration and restart. |
| No agent detected | Install and sign in to the agent CLI, then scan again. Studio will not silently select a different provider. |
| HTTPS site cannot reach loopback | Use Chrome or Edge on the same computer. Do not expose the connector on a network interface to bypass browser protection. |

## Safety guarantees

The connector binds only to loopback, accepts configured exact origins, requires a pairing token in production mode, and rejects filesystem access outside the explicit roots. Repository writes, worktree creation, tool installation, and agent execution require explicit confirmation. It never auto-commits, pushes, creates pull requests, or deploys. Review diffs and test evidence before accepting any agent result.
