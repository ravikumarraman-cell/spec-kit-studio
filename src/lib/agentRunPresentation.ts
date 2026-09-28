import { ConnectorJob } from './connector';
import { LocalAgentId, LocalAgentStatus, localAgentLabel } from './agentAvailability';

export interface AgentFrameworkOption { name: string; desc: string; localAgent?: LocalAgentId; }

export const DEFAULT_AGENT_FRAMEWORKS: AgentFrameworkOption[] = [
  { name: 'Codex CLI', desc: 'Runs locally through Studio with a scoped, reviewable task contract', localAgent: 'codex' },
  { name: 'Claude Code', desc: 'Runs locally through Studio when Claude Code is installed', localAgent: 'claude' },
  { name: 'GitHub Copilot CLI', desc: 'Runs locally through Studio when Copilot CLI is installed', localAgent: 'copilot' },
  { name: 'Gemini', desc: 'Portable handoff: copy the focused task prompt to Gemini' },
  { name: 'Cursor', desc: 'Portable handoff: copy the focused task prompt to Cursor' },
  { name: 'Windsurf / Aider', desc: 'Portable handoff: copy the focused task prompt to your local agent' },
];

export function mergeDiscoveredAgentFrameworks(agents: unknown): AgentFrameworkOption[] {
  if (!Array.isArray(agents)) return DEFAULT_AGENT_FRAMEWORKS;
  const known = new Set(DEFAULT_AGENT_FRAMEWORKS.flatMap((agent) => agent.localAgent ? [agent.localAgent] : []));
  const additions = (agents as LocalAgentStatus[])
    .filter((agent) => agent?.installed && typeof agent.id === 'string' && typeof agent.label === 'string' && !known.has(agent.id))
    .map((agent) => ({ name: localAgentLabel(agent), desc: 'Runs locally through Studio with the capabilities declared by its connector adapter', localAgent: agent.id }));
  return [...DEFAULT_AGENT_FRAMEWORKS, ...additions];
}

export function changedFilesFromJobEvidence(job: ConnectorJob): string[] {
  const captured = job.evidence?.changedFiles || [];
  if (captured.length) return captured;
  return (job.evidence?.repositoryStatus || '').split('\n')
    .map((line) => line.slice(3).trim()).filter(Boolean)
    .map((file) => file.includes(' -> ') ? file.split(' -> ').at(-1) || file : file);
}

export function jobFailureGuidance(output: string): { heading: string; detail: string; next: string } {
  const text = output.toLowerCase();
  if (/hang|timed out|stopped after|timeout/.test(text)) return { heading: 'Verification did not finish', detail: 'The run was stopped while a command was still waiting. Any changed files are retained below; no successful result has been recorded.', next: 'Review the changed files and the last diagnostic, then fix or isolate the slow check before retrying this task.' };
  if (/assertionerror|\bfailed\b|\berror\b/.test(text)) return { heading: 'One or more checks need attention', detail: 'The agent returned a non-success result. Studio preserved its evidence but will not treat the task as complete.', next: 'Use the last diagnostic and changed-file list below to make a focused correction, then retry only this task.' };
  return { heading: 'The run did not complete', detail: 'Studio preserved the available evidence. It cannot safely infer whether the task is complete.', next: 'Review the captured output and changed files before deciding whether to fix, retry, or discard partial work.' };
}

export function verificationFindings(markdown: string): string[] {
  const heading = markdown.search(/^##\s+.*(?:verification|test).*(?:evidence|result|report)/im);
  if (heading < 0) return [];
  const remainder = markdown.slice(heading);
  const nextHeading = remainder.slice(3).search(/^##\s+/m);
  return (nextHeading < 0 ? remainder : remainder.slice(0, nextHeading + 3)).split('\n')
    .filter((line) => /\b(fail(?:ed|ure)?|hang|unresolved|blocked|did not complete|not marked passed|interrupted)\b/i.test(line))
    .map((line) => line.replace(/^\s*[-*|]\s*/, '').replace(/\|/g, ' · ').replace(/`/g, '').trim())
    .filter((line) => line.length > 20).slice(0, 8);
}
