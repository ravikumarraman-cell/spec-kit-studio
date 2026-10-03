import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('../', import.meta.url);

test('Vercel serves the application with transport and content security policies', () => {
  const configuration = JSON.parse(readFileSync(new URL('vercel.json', root), 'utf8')) as {
    headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
  };
  const applicationHeaders = configuration.headers.find((entry) => entry.source === '/(.*)')?.headers || [];
  const headers = new Map(applicationHeaders.map((header) => [header.key.toLowerCase(), header.value]));
  assert.match(headers.get('strict-transport-security') || '', /max-age=31536000/);
  assert.match(headers.get('content-security-policy') || '', /default-src 'self'/);
  assert.doesNotMatch(headers.get('content-security-policy') || '', /unsafe-eval/);
});

test('the deployed CSP permits only the exact inline JSON-LD metadata', () => {
  const html = readFileSync(new URL('index.html', root), 'utf8');
  const jsonLd = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(jsonLd);
  const hash = createHash('sha256').update(jsonLd).digest('base64');
  const configuration = readFileSync(new URL('vercel.json', root), 'utf8');
  assert.match(configuration, new RegExp(`sha256-${hash.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
});

test('the container runtime is non-root, health-checkable, and excludes local secrets', () => {
  const dockerfile = readFileSync(new URL('Dockerfile', root), 'utf8');
  const dockerignore = readFileSync(new URL('.dockerignore', root), 'utf8');

  assert.match(dockerfile, /FROM node:22\.6\.0-bookworm-slim AS runtime/);
  assert.match(dockerfile, /ENV NODE_ENV=production/);
  assert.match(dockerfile, /USER node/);
  assert.match(dockerfile, /HEALTHCHECK[\s\S]*\/api\/health/);
  assert.match(dockerfile, /CMD \["node", "dist\/server\.cjs"\]/);
  assert.doesNotMatch(dockerfile, /COPY\s+\.env/);
  assert.match(dockerignore, /^\.env$/m);
  assert.match(dockerignore, /^\.env\.\*$/m);
  assert.match(dockerignore, /^!\.env\.example$/m);
});
