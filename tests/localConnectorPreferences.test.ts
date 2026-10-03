import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

test('local connector is a shared Settings capability, not a persona workflow step', () => {
  const settings = source('../src/components/settings/StudioSettings.tsx');
  const agents = source('../src/components/settings/LocalAgentPreferences.tsx');
  const preference = source('../src/components/settings/LocalConnectorPreferences.tsx');
  assert.match(settings, /LocalConnectorPreferences/);
  assert.match(settings, /LocalAgentPreferences/);
  assert.match(agents, /else await refreshRuntimeAgentAvailability\(\)/);
  assert.match(agents, /CONNECTOR_CONFIGURATION_CHANGED_EVENT/);
  assert.doesNotMatch(agents, /if \(!repositoryPath\) return/);
  assert.match(preference, /Shared connector preferences for every Studio persona and route/);
  assert.match(preference, /connectorClient\(endpoint, token\.trim\(\)\)\.health\(\)/);
  assert.match(preference, /saveConfiguredConnectorUrl/);
  assert.match(preference, /setConnectorSessionToken/);
  assert.doesNotMatch(preference, /repositoryPath|\.scan\(|preparePersonaDraft|start[A-Z]/);
});

test('connector preference changes notify already-open connector consumers', () => {
  const connector = source('../src/lib/connector.ts');
  const workspace = source('../src/components/workspace/WorkspaceControlCenter.tsx');
  assert.match(connector, /CONNECTOR_CONFIGURATION_CHANGED_EVENT/);
  assert.match(connector, /window\.dispatchEvent\(new Event\(CONNECTOR_CONFIGURATION_CHANGED_EVENT\)\)/);
  assert.match(workspace, /addEventListener\(CONNECTOR_CONFIGURATION_CHANGED_EVENT, refreshConfiguration\)/);
  assert.match(workspace, /configuredConnectorUrl\(\)/);
});
