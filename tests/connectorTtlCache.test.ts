import assert from 'node:assert/strict';
import test from 'node:test';

test('connector cache coalesces duplicate scans and expires deterministically', async () => {
  const { createTtlCache } = await import('../connector/ttlCache.mjs');
  let time = 0; let loads = 0;
  const cache = createTtlCache({ ttlMs: 100, now: () => time });
  const load = async () => ++loads;
  assert.deepEqual(await Promise.all([cache.get('/repo', load), cache.get('/repo', load)]), [1, 1]);
  time = 101;
  assert.equal(await cache.get('/repo', load), 2);
});

test('connector invalidates repository scans before mutating workspace operations', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL('../connector/server.mjs', import.meta.url), 'utf8');
  assert.match(source, /const applied = await apply\(root, payload\.files\); invalidateScan\(root\)/);
  assert.match(source, /invalidateScan\(root\); return send\(req, res, 202, await startSpecKitAgent/);
  assert.match(source, /invalidateScan\(root\); return send\(req, res, 202, startLocalAgentImplementation/);
});
