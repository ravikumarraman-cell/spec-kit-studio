import assert from 'node:assert/strict';
import test from 'node:test';
import { agentSupports, defaultGenerationPath, LocalAgentStatus, localAgentLabel, recommendedLocalAgent } from '../src/lib/agentAvailability';

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

test('keeps the local Engine path selected when no local coding agent is runnable', () => {
  assert.equal(recommendedLocalAgent(agents({})), undefined);
  assert.equal(defaultGenerationPath(agents({})), 'engine');
});

test('selects a connector-provided agent by capability without a frontend enum change', () => {
  const aider: LocalAgentStatus = { id: 'aider', label: 'Aider', installed: true, capabilities: ['planning', 'implementation'] };
  assert.equal(localAgentLabel(aider), 'Aider');
  assert.equal(agentSupports(aider, 'story-extraction'), false);
  assert.equal(recommendedLocalAgent([aider], 'aider', 'implementation')?.id, 'aider');
  assert.equal(recommendedLocalAgent([aider], 'aider', 'story-extraction'), undefined);
});
