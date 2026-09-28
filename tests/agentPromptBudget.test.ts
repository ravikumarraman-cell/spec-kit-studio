import assert from 'node:assert/strict';
import test from 'node:test';
import { compactAgentPacket, AGENT_PROMPT_LIMITS } from '../src/lib/agentPromptBudget';

test('bounds browser-generated agent packets while retaining their purpose and completion contract', () => {
  const packet = `Objective at the start\n${'unrelated planning prose '.repeat(1_000)}\nDefinition of done at the end`;
  const compact = compactAgentPacket(packet);

  assert.ok(compact.length <= AGENT_PROMPT_LIMITS.maximumPacket);
  assert.match(compact, /Objective at the start/);
  assert.match(compact, /Definition of done at the end/);
  assert.match(compact, /truncated to conserve context/);
});

test('connector applies the same final packet boundary to every local-agent run', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL('../connector/server.mjs', import.meta.url), 'utf8');

  assert.match(source, /import \{ compactAgentPrompt \} from '\.\/agentPrompt\.mjs'/);
  assert.match(source, /adapterArgs\(selected, operation, compactAgentPrompt\(prompt\)\)/);
  assert.match(source, /adapterArgs\(selected, 'implementation', compactAgentPrompt\(prompt \+ guardrails\)\)/);
});
