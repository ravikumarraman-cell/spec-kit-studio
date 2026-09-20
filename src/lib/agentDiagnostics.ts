import { LocalAgentStatus } from './agentAvailability';

/** Converts known local-agent CLI failures into a safe, user-actionable next step. */
export function agentFailureGuidance(agent: LocalAgentStatus['id'], output: string): string {
  if (agent === 'copilot' && /not logged in|please run\s+\/login/i.test(output)) {
    return 'GitHub Copilot CLI is installed but not signed in. In a Terminal, run `copilot`, enter `/login`, complete the GitHub sign-in, then return to Studio and run the work packet again. You can select Gemini instead if you want to continue without Copilot.';
  }
  if (/connector token is required/i.test(output)) {
    return 'Your local connector requires its pairing token. Open Connected Workspace, enter the value configured as STUDIO_CONNECTOR_TOKEN, scan once, then return here.';
  }
  return output || 'The local coding agent did not complete the work packet. Review the command output and try again.';
}
