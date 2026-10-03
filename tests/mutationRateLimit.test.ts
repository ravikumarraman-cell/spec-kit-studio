import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import type { AddressInfo } from 'node:net';
import { finalizeApplication } from '../server/app';
import { createMutationRateLimit } from '../server/middleware/mutationRateLimit';

test('mutation rate limit leaves reads alone and returns a retryable typed response for excess writes', async () => {
  let currentTime = 10_000;
  const app = express();
  app.use(createMutationRateLimit({ maxRequests: 2, windowMs: 60_000, now: () => currentTime }));
  app.get('/api/work', (_request, response) => response.status(204).end());
  app.post('/api/work', (_request, response) => response.status(204).end());
  finalizeApplication(app);

  await withServer(app, async (baseUrl) => {
    assert.equal((await fetch(`${baseUrl}/api/work`)).status, 204);
    assert.equal((await fetch(`${baseUrl}/api/work`, { method: 'POST' })).status, 204);
    assert.equal((await fetch(`${baseUrl}/api/work`, { method: 'POST' })).status, 204);

    const limited = await fetch(`${baseUrl}/api/work`, { method: 'POST' });
    assert.equal(limited.status, 429);
    assert.equal(limited.headers.get('retry-after'), '60');
    const body = await limited.json() as { success: boolean; error: string; code: string; requestId: string };
    assert.equal(body.success, false);
    assert.equal(body.error, 'Too many state-changing requests. Try again shortly.');
    assert.equal(body.code, 'MUTATION_RATE_LIMITED');
    assert.equal(typeof body.requestId, 'string');

    currentTime += 60_000;
    assert.equal((await fetch(`${baseUrl}/api/work`, { method: 'POST' })).status, 204);
  });
});

async function withServer(app: express.Express, run: (baseUrl: string) => Promise<void>) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  try {
    await run(`http://127.0.0.1:${(server.address() as AddressInfo).port}`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}
