import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';

async function unusedPort() {
  const probe = createServer();
  probe.listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const port = probe.address().port;
  probe.close();
  await once(probe, 'close');
  return port;
}

async function waitFor(url, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try { return await fetch(url); } catch (error) { lastError = error; }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw lastError || new Error(`Production server did not start within ${timeoutMs}ms.`);
}

const port = await unusedPort();
const baseUrl = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['dist/server.cjs'], {
  cwd: process.cwd(),
  env: { ...process.env, NODE_ENV: 'production', HOST: '127.0.0.1', PORT: String(port) },
  stdio: 'ignore',
});

try {
  const shell = await waitFor(`${baseUrl}/`);
  assert.equal(shell.status, 200);
  assert.equal(shell.headers.get('cache-control'), 'no-store');
  const html = await shell.text();
  const assetPath = html.match(/(?:src|href)="(\/assets\/[^\"]+\.(?:js|css))"/)?.[1];
  assert.ok(assetPath, 'Expected the production HTML shell to reference a hashed asset.');

  const asset = await fetch(`${baseUrl}${assetPath}`);
  assert.equal(asset.status, 200);
  assert.match(asset.headers.get('cache-control') || '', /max-age=31536000.*immutable/);

  const serverBundle = await fetch(`${baseUrl}/server.cjs`);
  assert.equal(serverBundle.status, 404);
  process.stdout.write('Production server smoke test passed.\n');
} finally {
  server.kill('SIGTERM');
  await Promise.race([
    once(server, 'exit'),
    new Promise((resolve) => setTimeout(resolve, 5_000)),
  ]);
  if (!server.killed) server.kill('SIGKILL');
}
