import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { parseProductDiscoveryFeatureDraft, productDiscoveryFeaturePrompt } from '../src/lib/personas/productDiscoveryFeatureDraft';

test('persona drafting is repository-free, bounded, and explicitly confirmed', () => {
  const connector = readFileSync(new URL('../connector/server.mjs', import.meta.url), 'utf8');
  const client = readFileSync(new URL('../src/lib/connector.ts', import.meta.url), 'utf8');
  assert.match(connector, /\/v1\/persona-draft\/prepare/);
  assert.match(connector, /PREPARE_PERSONA_DRAFT/);
  assert.match(connector, /spec-kit-studio-persona-/);
  assert.match(connector, /Do not read, create, edit, commit, or delete files/);
  assert.match(connector, /\/v1\/agents\/available/);
  assert.match(client, /preparePersonaDraft/);
  assert.match(connector, /req\.method === 'GET' \|\| req\.method === 'POST'/);
  assert.match(client, /availableAgents/);
});

test('Product Manager discovery output is bounded to reviewable user stories and requirements', () => {
  const source = 'Leaders need a fast tenant health summary.';
  assert.match(productDiscoveryFeaturePrompt('Tenant summary', source), /Return one to five independently reviewable user stories/);
  const draft = parseProductDiscoveryFeatureDraft(JSON.stringify({
    title: 'Tenant summary', summary: 'A concise health view.',
    userStories: [{ id: 'US-001', title: 'View summary', priority: 'High', asA: 'leader', iWantTo: 'see tenant health', soThat: 'I can act quickly', acceptanceCriteria: ['Shows status and risk'], requirementIds: ['FR-001'] }],
    functionalRequirements: [{ id: 'FR-001', title: 'Show health', description: 'The summary must show health and risk.', category: 'UI/UX', priority: 'High' }],
  }), source);
  assert.equal(draft?.userStories?.[0].id, 'US-001');
  assert.equal(draft?.functionalRequirements?.[0].category, 'UI/UX');
  assert.equal(parseProductDiscoveryFeatureDraft('{"title":"missing"}', source), undefined);
});
