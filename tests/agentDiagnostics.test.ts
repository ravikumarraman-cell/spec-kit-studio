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

test('connector compatibility and write-scope failures explain the safe recovery', () => {
  assert.match(agentFailureGuidance('codex', 'Your local connector needs an update before it can safely generate Spec-Kit artifacts.'), /newer local connector/);
  assert.match(agentFailureGuidance('codex', 'Codex is configured for read-only planning only.'), /cannot create this official artifact/);
});

test('an outdated Spec-Kit CLI directs users to the guided update before implementation', () => {
  const guidance = agentFailureGuidance('codex', 'Spec-Kit 1.0.6 or newer is required for strict story conformance.');
  assert.match(guidance, /safely paused before implementation/);
  assert.match(guidance, /Update official Spec-Kit/);
});

test('Codex startup failures surface the local diagnostic without prescribing a futile connector restart', () => {
  const guidance = agentFailureGuidance('codex', 'ERROR codex_core::session: failed to load skill /tmp/SKILL.md: missing YAML frontmatter');
  assert.match(guidance, /stopped during local startup/);
  assert.match(guidance, /Read diagnostic output/);
  assert.doesNotMatch(guidance, /restart the local connector/i);
});

test('a terminal artifact identity failure wins over an incidental Codex startup warning', () => {
  const guidance = agentFailureGuidance('codex', 'ERROR failed to load skill: missing YAML frontmatter\nStudio required specs/001-tenant-compass/plan.md, but the agent wrote specs/002-tenant-exec/plan.md.');
  assert.match(guidance, /different feature folder/);
  assert.doesNotMatch(guidance, /stopped during local startup/);
});

test('a structured connector completion verdict always wins over earlier agent warnings', () => {
  const guidance = agentFailureGuidance('codex', 'ERROR failed to load skill: missing YAML frontmatter\n[[studio:completion-check-failed]]\nThe visual task plan is missing required narrow viewport evidence.\n[[/studio:completion-check-failed]]');
  assert.match(guidance, /Codex finished its work packet/);
  assert.match(guidance, /missing required narrow viewport evidence/);
  assert.doesNotMatch(guidance, /stopped during local startup/);
});

test('unknown diagnostic output is bounded before it is displayed', () => {
  const guidance = agentFailureGuidance('codex', 'x'.repeat(900));
  assert.ok(guidance.length < 700);
  assert.match(guidance, /did not complete/);
});
