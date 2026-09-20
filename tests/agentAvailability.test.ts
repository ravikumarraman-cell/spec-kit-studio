import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultGenerationPath, LocalAgentStatus, recommendedLocalAgent } from '../src/lib/agentAvailability';

const agents = (ready: Partial<Record<LocalAgentStatus['id'], boolean>>): LocalAgentStatus[] => [
  { id: 'claude', label: 'Claude Code', installed: Boolean(ready.claude) },
  { id: 'codex', label: 'Codex', installed: Boolean(ready.codex) },
  { id: 'copilot', label: 'GitHub Copilot CLI', installed: Boolean(ready.copilot) },
];

test('prefers Claude Code when more than one local agent is runnable', () => {
  assert.equal(recommendedLocalAgent(agents({ claude: true, codex: true }))?.id, 'claude');
  assert.equal(defaultGenerationPath(agents({ claude: true, codex: true })), 'engine');
});

test('uses the next runnable local agent when the preferred agent is absent', () => {
  assert.equal(recommendedLocalAgent(agents({ codex: true, copilot: true }))?.id, 'codex');
});

test('defaults to Gemini when no local coding agent is runnable', () => {
  assert.equal(recommendedLocalAgent(agents({})), undefined);
  assert.equal(defaultGenerationPath(agents({})), 'gemini');
});
