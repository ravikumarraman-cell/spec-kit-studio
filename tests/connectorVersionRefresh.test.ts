import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('connector version state is refreshed after a local restart', async () => {
  const [client, workspace, setup] = await Promise.all([
    readFile(new URL('../src/lib/connector.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/workspace/WorkspaceControlCenter.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/workspace/LocalConnectorSetup.tsx', import.meta.url), 'utf8'),
  ]);
  assert.match(client, /cache: endpoint === '\/health' \? 'no-store'/);
  assert.match(workspace, /window\.addEventListener\('focus', refreshOnFocus\)/);
  assert.match(workspace, /document\.addEventListener\('visibilitychange', refreshOnVisible\)/);
  assert.match(workspace, /onRefresh=\{\(\) => \{ void refreshConnectorStatus\(\); \}\}/);
  assert.match(setup, /Check installed version now/);
});
