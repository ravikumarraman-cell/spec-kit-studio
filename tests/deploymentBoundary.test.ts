import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { parseDeploymentBoundary } from '../src/lib/deploymentBoundary';

test('only a complete public deployment contract can mark Studio as regulated', () => {
  assert.deepEqual(parseDeploymentBoundary({ mode: 'dod', regulated: true, externalAiEgress: 'disabled' }), {
    mode: 'dod', regulated: true, externalAiEgress: 'disabled',
  });
  assert.equal(parseDeploymentBoundary({ mode: 'dod', regulated: true }), null);
  assert.equal(parseDeploymentBoundary({ mode: 'unknown', regulated: true, externalAiEgress: 'disabled' }), null);
});

test('regulated modes use one persistent boundary banner rather than per-screen labels', async () => {
  const [app, banner] = await Promise.all([
    readFile(new URL('../src/App.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/common/DeploymentBoundaryBanner.tsx', import.meta.url), 'utf8'),
  ]);
  assert.match(app, /<DeploymentBoundaryBanner \/>/);
  assert.match(banner, /GovCloud deployment boundary/);
  assert.match(banner, /DoD deployment boundary/);
  assert.match(banner, /External AI egress is disabled/);
  assert.match(banner, /Operating mode, not a certification claim/);
});
