import { LocalAgentStatus } from './agentAvailability';

/** Converts known local-agent CLI failures into a safe, user-actionable next step. */
export function agentFailureGuidance(agent: LocalAgentStatus['id'], output: string): string {
  const detail = String(output || '');
  if (/cannot reach the local connector|failed to fetch|networkerror|econnrefused/i.test(detail)) {
    return 'Studio cannot reach the local connector. Start or restart `npm run connector`, then confirm the local URL and pairing token in Connected Workspace.';
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
  const conciseDetail = detail.replace(/\s+/g, ' ').trim().slice(0, 500);
  return conciseDetail ? `The local coding agent did not complete the work packet. Review its redacted output, resolve the issue, and retry. Details: ${conciseDetail}` : 'The local coding agent did not complete the work packet. Review the redacted output and try again.';
}
