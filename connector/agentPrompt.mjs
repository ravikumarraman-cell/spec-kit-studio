/**
 * The connector is the last common boundary before any supported local agent.
 * Keep packets small even when a UI caller, pasted notes, or a future feature
 * accidentally provides an entire planning artifact.
 */
export const DEFAULT_AGENT_PACKET_LIMIT = 8_000;

export function compactAgentPrompt(value, limit = DEFAULT_AGENT_PACKET_LIMIT) {
  const text = String(value || '').replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n').trim();
  if (text.length <= limit) return text;
  const marker = '\n\n… [context omitted by Studio; inspect the referenced repository artifact only if needed] …\n\n';
  const remaining = Math.max(0, limit - marker.length);
  const head = Math.ceil(remaining * 0.72);
  return `${text.slice(0, head).trimEnd()}${marker}${text.slice(-(remaining - head)).trimStart()}`;
}
