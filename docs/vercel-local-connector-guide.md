# Use a Vercel-hosted Studio with local coding agents

This guide lets one person use the Spec-Kit Studio website from Vercel while keeping repositories and coding agents on their own computer.

It is written for someone who is comfortable copying commands but does not need to be a deployment or security specialist.

## What you are setting up

You will run two separate pieces of software:

```text
1. Vercel hosts the Studio website             https://studio.example.com
2. Your computer runs the local connector      http://127.0.0.1:4318
3. The connector starts your local agent       Codex, Claude Code, or Copilot CLI
4. The agent works in a repository on your Mac
```

The Vercel website does **not** gain access to your computer by itself. When you press a local action in Studio, the browser talks to the connector on the same computer. The connector checks its configuration, asks for the explicit action confirmation built into Studio, and then starts an installed local coding agent in an allowed repository.

## What stays where

| Item | Where it belongs | Do not put it here |
| --- | --- | --- |
| Studio website and optional hosted API | Vercel | Your local repository path or connector token |
| Local repository and linked worktrees | Your computer | Vercel filesystem |
| Codex, Claude Code, or Copilot CLI login | Your computer, managed by that CLI | Studio forms or Vercel environment variables |
| `STUDIO_CONNECTOR_TOKEN` | Your computer only | Vercel environment variables, Git, screenshots, or chat |
| `STUDIO_ALLOWED_ROOTS` | Your computer only | Vercel environment variables |
| `GEMINI_API_KEY` when using server-side Gemini generation | Vercel encrypted environment variables | Browser-accessible `VITE_*` variables |

When you use a local coding agent, its provider account is the account already signed into that CLI on your computer. Studio does not receive that provider credential. By contrast, any Gemini, GitHub, or Jira credential configured as a Vercel environment variable is a hosted, organization-controlled credential—not each user's personal credential.

## Before you begin

You need:

1. A Git repository containing this `spec-kit-studio` project.
2. A Vercel account with permission to create a project from that repository.
3. A current version of Node supported by this project. The project declares Node `>=22.12.0 <23` in `package.json`.
4. The standalone local connector package downloaded from the deployed Studio site. A Studio checkout is optional and needed only for contributors.
5. At least one local agent installed and signed in: Codex CLI, Claude Code, or GitHub Copilot CLI.
6. A repository you want the agent to work on.
7. A modern Chromium browser (Chrome or Edge recommended for the first setup).

Use a stable Vercel production URL or custom domain for normal work. Vercel preview URLs are intentionally inconvenient for this use case because each one is a different browser origin and must be explicitly allowed by the local connector.

## Part 1 — Deploy Studio to Vercel

### 1. Create the Vercel project

1. Sign in to Vercel.
2. Choose **Add New → Project**.
3. Import the Git repository that contains Spec-Kit Studio.
4. Keep the project root at the directory containing `package.json` and `vercel.json`.
5. Click **Deploy**.

This repository already contains `vercel.json`. It tells Vercel to build with `npm run build`, publish `dist`, include the dedicated bundled API request handler with the Vercel function, route `/api/*` to that handler, and send other paths to the single-page application. No connector is deployed to Vercel.

Vercel supports Vite projects directly. Its Vite guide also explains the SPA rewrite needed for direct links to application routes. [Vercel’s Vite deployment guide](https://vercel.com/docs/frameworks/frontend/vite)

### 2. Set hosted environment variables only when needed

In **Vercel → Your Project → Settings → Environment Variables**, add only values that the hosted API truly needs.

| Variable | Add it when | Notes |
| --- | --- | --- |
| `GEMINI_API_KEY` | You want Studio's server-side Gemini generation | Keep it encrypted in Vercel. Never name it `VITE_GEMINI_API_KEY`. |
| `APP_URL` | An integration needs the public Studio URL | Set it to the final HTTPS URL, for example `https://studio.example.com`. |
| `GITHUB_TOKEN` | You deliberately enable server-side GitHub integration | Treat it as organization-owned access and use the least privilege possible. |
| `JIRA_DOMAIN`, `JIRA_EMAIL`, `JIRA_API_TOKEN` | You deliberately enable server-side Jira integration | Treat these as organization-owned integration credentials. |

Do **not** add any of the following to Vercel:

```text
STUDIO_ALLOWED_ROOTS
STUDIO_CONNECTOR_TOKEN
STUDIO_CONNECTOR_MODE
STUDIO_ALLOWED_ORIGINS
```

Those values control a service on your laptop. Putting them in Vercel does not configure your laptop and risks exposing information that should stay local.

### 3. Use one stable HTTPS address

After deployment, copy the production address, such as:

```text
https://spec-kit-studio-your-team.vercel.app
```

Better still, add a custom domain such as:

```text
https://studio.example.com
```

Use the exact address in the next section:

- Include `https://`.
- Do not add a trailing `/`.
- Do not use `http://`.
- Do not use `*` wildcards.

For example, `https://studio.example.com` is correct. `https://studio.example.com/` is not accepted as an exact connector origin.

## Part 2 — Configure the connector on your computer

### 4. Pick a safe local folder boundary

The connector can read and, after confirmation, write only inside `STUDIO_ALLOWED_ROOTS`. Choose the smallest folder that contains both:

- the repository clone you want to connect; and
- any linked worktrees Studio will create.

For example, create a dedicated folder:

```text
/Users/your-name/work/studio-repositories
```

Then place both the clone and its worktrees under it:

```text
/Users/your-name/work/studio-repositories/cloud-asset-inventory
/Users/your-name/work/studio-repositories/worktrees/copy-tenant-id
```

Do not use `/`, your whole home directory, or a broad company folder unless that is truly what you intend to authorize.

### 5. Create a long local pairing token

In Terminal, generate a token:

```bash
openssl rand -base64 48
```

Copy the output somewhere private temporarily. It is a key shared only by this browser session and the connector on this computer. It is not a Codex, Claude, GitHub, or Vercel credential.

### 6. Add local connector settings

Create a private folder for connector settings, then open it in Terminal:

```bash
mkdir -p "$HOME/.spec-kit-studio-connector"
cd "$HOME/.spec-kit-studio-connector"
```

Install the standalone connector from **Connected Workspace → Install the local connector** before continuing. Create `.env.local` in this private folder. Replace every example value below with your own values:

```env
# Strict mode: production-safe local connector configuration.
STUDIO_CONNECTOR_MODE=production

# The narrow local folder that contains approved clones and worktrees.
STUDIO_ALLOWED_ROOTS="/Users/your-name/work/studio-repositories"

# The exact Vercel production or custom-domain URL. No trailing slash.
STUDIO_ALLOWED_ORIGINS="https://studio.example.com"

# Paste the long random value generated in the preceding step.
STUDIO_CONNECTOR_TOKEN="paste-your-long-random-token-here"

# Optional: choose the local Codex model only when your Codex account supports it.
STUDIO_CODEX_MODEL="gpt-5.6-luna"

# Optional advanced override. Defaults to true: connector-launched Codex runs
# ignore user-level Codex configuration so unrelated plugins and skills cannot
# inflate the request. Keep the default unless you intentionally need a
# trusted user-level Codex customization.
# STUDIO_CODEX_IGNORE_USER_CONFIG="false"
```

If you use the Vercel-generated URL rather than a custom domain, it might look like this:

```env
STUDIO_ALLOWED_ORIGINS="https://spec-kit-studio-your-team.vercel.app"
```

Never commit `.env.local`. It should already be ignored by Git; confirm before committing any configuration change. On a shared computer, restrict its filesystem permissions according to your operating-system policy.

### 7. Start the local connector

From that same Terminal window, run:

```bash
spec-kit-studio-connector
```

Leave that Terminal window running while you use Studio. A successful start prints a message similar to:

```text
Spec-Kit Studio connector listening at http://127.0.0.1:4318
```

You can verify the connector without touching a repository by opening this address in the browser on the same computer:

```text
http://127.0.0.1:4318/health
```

Expected result:

```json
{
  "status": "ok",
  "version": "0.1.0",
  "mode": "production",
  "tokenRequired": true
}
```

Seeing `mode: "production"` and `tokenRequired: true` confirms that strict local configuration is active.

## Part 3 — Connect the Vercel UI to your computer

### 8. Enter the local connection details in Studio

1. Open your Vercel URL in Chrome or Edge on the **same computer** running the connector.
2. Open **Connected Workspace**.
3. Open **Connection settings**.
4. Enter the following:

   | Field | Value |
   | --- | --- |
   | Connector URL | `http://127.0.0.1:4318` |
   | Pairing token | The exact `STUDIO_CONNECTOR_TOKEN` from `.env.local` |
   | Repository path | An absolute path inside `STUDIO_ALLOWED_ROOTS`, for example `/Users/your-name/work/studio-repositories/cloud-asset-inventory` |

5. Save the connection settings.
6. Select **Scan repository**.

The scan is read-only. It collects bounded repository evidence, such as manifests, Git state, declared checks, and which local agents are available. Read the result before continuing.

### 9. Use the normal Studio workflow

After a successful scan:

1. Confirm or install the official Spec-Kit workflow only if you want it and approve the local action.
2. Run the repository's declared baseline checks.
3. Start a feature or a focused user story.
4. Review the generated scope, plan, and tasks.
5. Create a linked worktree when Studio requests one for implementation.
6. Select the local agent you are signed into.
7. Review the task and explicitly confirm execution.
8. Inspect changed files and verification evidence before marking the task reviewed.

Studio does not automatically commit, push, create pull requests, or deploy the target repository.

## How agent identity and billing work

When you choose **Codex**, **Claude Code**, or **GitHub Copilot CLI**, the connector starts the command installed on your computer. That command uses its existing local sign-in.

| You choose | The agent authenticates with | Provider usage belongs to |
| --- | --- | --- |
| Codex | The Codex account already signed in on your computer | That account or its organization |
| Claude Code | The Claude account or provider setup already signed in locally | That account or its organization/provider setup |
| GitHub Copilot CLI | The GitHub account already signed in locally | That GitHub account or its organization entitlement |

The local connector does not send provider API keys through Studio. If a CLI is not installed or not signed in, Studio will report that it is unavailable and you must complete that CLI's own installation/sign-in flow.

## Browser compatibility and local-network limits

The Vercel site is HTTPS while the loopback connector is HTTP. Chrome and Edge are the recommended browsers for this initial model. Browsers apply evolving local-network and mixed-content protections; Safari/WebKit may block an HTTPS website from talking to `http://127.0.0.1` even when the connector is correctly configured.

The connector includes the CORS and Private Network Access response support expected for a loopback service, but browser behavior is not identical across platforms. If the connection works in Chrome/Edge and fails in Safari, use Chrome/Edge rather than weakening the connector or exposing it on the network. Background on these browser controls: [MDN local-network access](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Local_network_access).

The long-term cross-browser and enterprise approach is a signed Studio Companion with an outbound secure connection. The current connector is a secure local bridge, not yet that Companion. See [Production deployment and user-owned agents](production-deployment-and-user-owned-agents.md).

## Troubleshooting

### “Studio cannot reach the local connector”

Check these in order:

1. Is the connector Terminal still open and showing the listening message?
2. Does `http://127.0.0.1:4318/health` open on the same computer?
3. Does Studio use exactly `http://127.0.0.1:4318` as its connector URL?
4. Are you using Chrome or Edge rather than Safari?
5. Did a company VPN, proxy, browser extension, or endpoint-security policy block loopback access?

Restart the connector after changing `.env.local`.

### “This Studio origin is not allowed”

The address in `STUDIO_ALLOWED_ORIGINS` does not exactly match the page open in the browser.

1. Copy the URL from the browser address bar.
2. Keep only the origin: `https://host-name` with no path or trailing slash.
3. Update `STUDIO_ALLOWED_ORIGINS` locally.
4. Stop the connector with `Control+C`, start it again with `spec-kit-studio-connector`, and retry.

For a Vercel preview URL, add that exact preview origin temporarily. Do not use a wildcard to make all preview deployments trusted.

### “Connector token is required”

The pairing token in Studio does not match `STUDIO_CONNECTOR_TOKEN` in the connector's local `.env.local` file. Copy the same value into Studio's Connection settings. Do not paste it into Vercel.

### “Repository path is outside STUDIO_ALLOWED_ROOTS”

Move the clone/worktree beneath the configured allowed folder, or change `STUDIO_ALLOWED_ROOTS` to the smallest parent directory that contains both. Restart the connector after any change.

### “No local agent is available”

Install and sign into the desired CLI in a separate terminal first. Then restart the connector and scan the repository again. Studio detects agent availability from the local machine; Vercel cannot install or sign into an agent for you.

### The Studio page works, but work does not appear on another computer

Current workspace data is stored in the browser's IndexedDB. Deploying the UI to Vercel does not yet make that state synchronize across computers, browsers, or users. Use the same browser profile for continuing a local workflow, or export the reviewed artifacts. A cloud control plane is a future production phase.

## Stop or revoke local access

To stop all local connector access, return to its Terminal window and press `Control+C`.

To prevent the deployed Studio origin from connecting again:

1. Remove or change `STUDIO_ALLOWED_ORIGINS` in local `.env.local`.
2. Replace `STUDIO_CONNECTOR_TOKEN` with a newly generated random value.
3. Restart the connector only when you are ready to use it again.

Changing the token invalidates the previous browser pairing token. If the computer is lost or shared, also sign out of the local agent CLIs using each provider's own instructions.

## Security checklist before regular use

- [ ] The Vercel URL uses HTTPS and is a stable production/custom domain.
- [ ] `STUDIO_CONNECTOR_MODE=production` is set locally.
- [ ] The allowed root is narrow and contains only intended repositories/worktrees.
- [ ] The allowed origin is exact, HTTPS-only, and has no wildcard or trailing slash.
- [ ] The pairing token is long, random, private, and absent from Vercel/Git.
- [ ] The connector binds only to `127.0.0.1`; do not change it to a network address.
- [ ] You understand that each agent run uses the local CLI account selected on that computer.
- [ ] You review planned changes, diffs, and verification evidence before accepting a task.
- [ ] GitHub and Jira tokens are entered only when needed. Studio retains them for the current browser session, not across browser restarts; revoke a token immediately if it was pasted into the wrong browser profile.
- [ ] If `GEMINI_API_KEY`, `GITHUB_TOKEN`, or Jira server credentials are configured in Vercel, the deployment is protected by Vercel Deployment Protection or an equivalent identity-aware access layer. A public site with server-side provider credentials is not a safe multi-user production service.

For the fuller enterprise architecture—device enrollment, single sign-on, short-lived signed action grants, durable audit logs, and organization-paid workers—see [Production deployment and user-owned agents](production-deployment-and-user-owned-agents.md) and the [production-readiness progress ledger](production-readiness-progress.md).
