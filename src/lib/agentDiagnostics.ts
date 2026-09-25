import { LocalAgentStatus } from './agentAvailability';

/** Converts known local-agent CLI failures into a safe, user-actionable next step. */
export function agentFailureGuidance(agent: LocalAgentStatus['id'], output: string): string {
  const detail = String(output || '');
  if (/cannot reach the local connector|failed to fetch|networkerror|econnrefused/i.test(detail)) {
    return 'Studio cannot reach the local connector. Start or restart `npm run connector`, then confirm the local URL and pairing token in Connected Workspace.';
  }
  if (/request is too large/i.test(detail)) {
    return 'Studio stopped this request before the local agent started because the browser sent more context than the connector safely accepts. Refresh to load the current Studio release and retry; you do not need to shorten the task. If it continues after a hard refresh, update the deployed Studio UI.';
  }
  if (agent === 'copilot' && /not logged in|please run\s+\/login/i.test(output)) {
    return 'GitHub Copilot CLI is installed but not signed in. In a Terminal, run `copilot`, enter `/login`, complete the GitHub sign-in, then return to Studio and run the work packet again. You can select Gemini instead if you want to continue without Copilot.';
  }
  if (/connector token is required/i.test(output)) {
    return 'Your local connector requires its pairing token. Open Connected Workspace, enter the value configured as STUDIO_CONNECTOR_TOKEN, scan once, then return here.';
  }
  if (agent === 'codex' && /spawn codex enoent|codex: command not found|command not found.*codex/i.test(detail)) {
    return 'Codex CLI is not available to the connector. Install Codex CLI, open a Terminal in the repository and sign in, then scan Connected Workspace again before retrying.';
  }
  if (agent === 'codex' && /not logged in|run\s+\/login|authentication required|login required/i.test(detail)) {
    return 'Codex CLI needs a local sign-in. Open a Terminal in the connected repository, run `codex`, complete the sign-in flow, then return to Studio and retry this task.';
  }
  if (agent === 'codex' && /failed to load (?:models cache|skill)|missing YAML frontmatter|reading additional input from stdin/i.test(detail)) {
    return 'Codex started with unrelated local-session configuration and stopped before it received the Studio work packet. Update and restart the local connector; it now launches Codex in an isolated session while preserving your normal local sign-in.';
  }
  if (/no (?:supported npm test script|declared automated test command) was detected/i.test(detail)) {
    return 'This repository does not declare an automated test command. Use its documented verification command, inspect the result, and only record the implementation when you are satisfied.';
  }
  if (/cancelled by the studio user|process stopped by sigterm/i.test(detail)) {
    return 'The local run was stopped. It may have made partial changes, so inspect the captured changed files and diff before retrying.';
  }
  if (/outside studio_allowed_roots/i.test(detail)) {
    return 'This repository is not within a permitted connector folder. Add its parent folder to STUDIO_ALLOWED_ROOTS, restart the connector, then scan the repository again.';
  }
  if (/repository path does not exist/i.test(detail)) {
    return 'Studio cannot find that repository folder. Reconnect the workspace using an existing absolute path, then retry.';
  }
  if (/local connector needs an update before it can safely generate Spec-Kit artifacts/i.test(detail)) {
    return 'This Studio release requires a newer local connector before it can safely create official artifacts. Open Connected Workspace, install the current connector release, restart it, then retry.';
  }
  if (/configured for read-only planning only/i.test(detail)) {
    return 'The selected local agent is configured for evidence-only work and cannot create this official artifact. Select an agent with artifact-generation access or add its planning-write connector operation, then retry.';
  }
  if (/still contains (?:an official )?template placeholder|still contains template placeholders/i.test(detail)) {
    return 'The agent created an official file but left a template marker in it, so Studio cannot approve it. Run the stage again; Studio will require a completed, feature-specific artifact before review.';
  }
  const conciseDetail = detail.replace(/\s+/g, ' ').trim().slice(0, 500);
  return conciseDetail ? `The local coding agent did not complete the work packet. Review its redacted output, resolve the issue, and retry. Details: ${conciseDetail}` : 'The local coding agent did not complete the work packet. Review the redacted output and try again.';
}
