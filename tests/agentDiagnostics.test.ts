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

test('Codex installation and sign-in failures produce distinct recovery guidance', () => {
  assert.match(agentFailureGuidance('codex', 'spawn codex ENOENT'), /Codex CLI is not available/);
  assert.match(agentFailureGuidance('codex', 'Not logged in'), /needs a local sign-in/);
});

test('connector and cancellation failures are made safe and actionable', () => {
  assert.match(agentFailureGuidance('codex', 'Failed to fetch'), /cannot reach the local connector/);
  assert.match(agentFailureGuidance('codex', 'Cancelled by the Studio user.'), /partial changes/);
});

test('unknown diagnostic output is bounded before it is displayed', () => {
  const guidance = agentFailureGuidance('codex', 'x'.repeat(900));
  assert.ok(guidance.length < 700);
  assert.match(guidance, /did not complete/);
});
