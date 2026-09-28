/**
 * Small, deterministic context packets keep local agents from paying to reread
 * an entire feature plan for every delivery task. Limits are character based
 * because they are stable across supported local-agent CLIs; the token estimate
 * is intentionally advisory (tokenizers differ by model).
 */
export const AGENT_PROMPT_LIMITS = {
  // The task is the execution contract. Source artifacts remain in the
  // worktree, so surrounding context stays deliberately small.
  featureSummary: 480,
  taskDescription: 1_200,
  requirementDescription: 360,
  ruleStatement: 240,
  stackGuidance: 480,
  maximumPacket: 8_000,
  finalResponseBullets: 8,
} as const;

export function normalizeAgentText(value: string | undefined | null): string {
  return String(value || '').replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n').trim();
}

/**
 * Preserve the beginning (intent) and end (constraints/decisions) of a large
 * artifact, while directing the agent to the source file for any detail it
 * needs. This avoids silently dropping the conclusion of a plan.
 */
export function excerptForAgent(value: string | undefined | null, limit: number, source?: string): string {
  const text = normalizeAgentText(value);
  if (text.length <= limit) return text;

  const marker = `\n… [truncated to conserve context${source ? `; read ${source} only if this task needs more detail` : ''}] …\n`;
  const remaining = Math.max(0, limit - marker.length);
  const headLength = Math.ceil(remaining * 0.72);
  const tailLength = remaining - headLength;
  return `${text.slice(0, headLength).trimEnd()}${marker}${text.slice(-tailLength).trimStart()}`;
}

export function estimatedPromptTokens(value: string): number {
  // Conservative, tokenizer-independent UI/logging estimate. Do not use this
  // for billing or model limits.
  return Math.ceil(normalizeAgentText(value).length / 4);
}

/** A final, shared guard for every browser-generated agent packet. */
export function compactAgentPacket(value: string): string {
  return excerptForAgent(value, AGENT_PROMPT_LIMITS.maximumPacket, 'the repository artifact');
}

export function conciseAgentReceipt(): string {
  return `Keep the final response to at most ${AGENT_PROMPT_LIMITS.finalResponseBullets} bullets: changed files, verification run, results, and unresolved assumptions. Do not paste artifact or source-file bodies.`;
}
