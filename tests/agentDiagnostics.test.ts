import assert from 'node:assert/strict';
import test from 'node:test';
import { agentFailureGuidance } from '../src/lib/agentDiagnostics';

test('Copilot authentication failure provides a one-time interactive login step and a fallback', () => {
  const guidance = agentFailureGuidance('copilot', 'Warning: no stdin data received\nNot logged in · Please run /login');
  assert.match(guidance, /run `copilot`/);
  assert.match(guidance, /`\/login`/);
  assert.match(guidance, /Gemini/);
});

test('connector pairing failure stays actionable without exposing a token', () => {
  const guidance = agentFailureGuidance('codex', 'Connector token is required.');
  assert.match(guidance, /STUDIO_CONNECTOR_TOKEN/);
  assert.doesNotMatch(guidance, /[A-Za-z0-9]{32,}/);
});
