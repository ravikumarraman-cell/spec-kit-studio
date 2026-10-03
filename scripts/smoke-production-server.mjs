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
const productionEnvironment = { ...process.env };
for (const name of [
  'GEMINI_API_KEY', 'GITHUB_TOKEN', 'JIRA_API_TOKEN',
  'STUDIO_GITHUB_APP_PRIVATE_KEY', 'STUDIO_GITHUB_APP_ID', 'STUDIO_GITHUB_APP_INSTALLATION_ID',
]) productionEnvironment[name] = '';
const server = spawn(process.execPath, ['dist/server.cjs'], {
  cwd: process.cwd(),
  env: { ...productionEnvironment, NODE_ENV: 'production', VERCEL: '', STUDIO_DEPLOYMENT_MODE: 'standard', STUDIO_AUTH_MODE: 'disabled', HOST: '127.0.0.1', PORT: String(port) },
  stdio: 'ignore',
});

try {
  const shell = await waitFor(`${baseUrl}/`);
  assert.equal(shell.status, 200);
  assert.equal(shell.headers.get('cache-control'), 'no-store');
  assert.match(shell.headers.get('content-security-policy') || '', /default-src 'self'/);
  assert.doesNotMatch(shell.headers.get('content-security-policy') || '', /unsafe-eval/);
  assert.match(shell.headers.get('strict-transport-security') || '', /max-age=31536000/);
  const html = await shell.text();
  const assetPath = html.match(/(?:src|href)="(\/assets\/[^\"]+\.(?:js|css))"/)?.[1];
  assert.ok(assetPath, 'Expected the production HTML shell to reference a hashed asset.');

  const asset = await fetch(`${baseUrl}${assetPath}`);
  assert.equal(asset.status, 200);
  assert.match(asset.headers.get('cache-control') || '', /max-age=31536000.*immutable/);

  const worker = await fetch(`${baseUrl}/service-worker.js`);
  assert.equal(worker.status, 200);
  assert.match(worker.headers.get('cache-control') || '', /no-cache/);
  assert.doesNotMatch(worker.headers.get('cache-control') || '', /immutable/);

  const manifest = await fetch(`${baseUrl}/manifest.webmanifest`);
  assert.equal(manifest.status, 200);
  assert.match(manifest.headers.get('cache-control') || '', /no-cache/);

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
