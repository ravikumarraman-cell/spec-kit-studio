import assert from 'node:assert/strict';
import test from 'node:test';
import type { AddressInfo } from 'node:net';
import { createGenerationRouter } from '../server/routes/generationRoutes';
import { createRepositoryRouter } from '../server/routes/repositoryRoutes';
import { createIntegrationRouter } from '../server/routes/integrationRoutes';
import { createApplication, finalizeApplication } from '../server/app';

function paths(router: ReturnType<typeof createGenerationRouter>) {
  return (router.stack as Array<{ route?: { path?: string } }>)
    .map((layer) => layer.route?.path)
    .filter((path): path is string => Boolean(path));
}

test('generation router retains all Spec-Kit generation endpoints', () => {
  assert.deepEqual(paths(createGenerationRouter()), ['/api/spec/generate', '/api/plan/generate', '/api/tasks/generate']);
});

test('repository router retains analysis and import endpoints', () => {
  assert.deepEqual(paths(createRepositoryRouter()), ['/api/repo/analyze', '/api/repo/generate-feature-for-imported', '/api/feature/import']);
});

test('integration router retains connected-service endpoints', () => {
  const routePaths = paths(createIntegrationRouter() as ReturnType<typeof createGenerationRouter>);
  assert.ok(routePaths.includes('/api/github/repos'));
  assert.ok(routePaths.includes('/api/github/commit-spec'));
  assert.ok(routePaths.includes('/api/jira/projects'));
  assert.ok(routePaths.includes('/api/jira/create-issue'));
});

async function withApplication(run: (baseUrl: string) => Promise<void>) {
  const app = createApplication({
    configureRoutes: (configuredApp) => {
      configuredApp.get('/api/test/failure', () => {
        throw new Error('sensitive implementation detail');
      });
    },
  });
  app.get('/app-shell', (_request, response) => response.type('html').send('<main>Spec-Kit Studio</main>'));
  app.get('*', (_request, response) => response.type('html').send('<main>Spec-Kit Studio SPA</main>'));
  finalizeApplication(app);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  try {
    const address = server.address() as AddressInfo;
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
}

test('application serves frontend middleware mounted before terminal handlers', async () => {
  await withApplication(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/app-shell`);

    assert.equal(response.status, 200);
    assert.match(await response.text(), /Spec-Kit Studio/);
  });
});

test('application returns a stable error envelope for unknown routes', async () => {
  await withApplication(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/not-real`, {
      headers: { 'x-request-id': 'test-request-id' },
    });
    const body = await response.json();

    assert.equal(response.status, 404);
    assert.equal(response.headers.get('x-request-id'), 'test-request-id');
    assert.deepEqual(body, {
      success: false,
      error: 'No route matches GET /api/not-real.',
      code: 'ROUTE_NOT_FOUND',
      requestId: 'test-request-id',
    });
  });
});

test('application rejects malformed JSON with a safe client error', async () => {
  await withApplication(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/audit/analyze`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{',
    });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.code, 'INVALID_JSON');
    assert.equal(body.error, 'The request body contains invalid JSON.');
    assert.equal(typeof body.requestId, 'string');
  });
});

test('application hides internal error details from clients', async () => {
  await withApplication(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/test/failure`);
    const body = await response.json();

    assert.equal(response.status, 500);
    assert.equal(body.code, 'INTERNAL_ERROR');
    assert.equal(body.error, 'The server could not complete the request.');
    assert.equal(JSON.stringify(body).includes('sensitive implementation detail'), false);
  });
});

test('generation routes return a typed service error when the AI provider is not configured', async () => {
  const previousApiKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  try {
    await withApplication(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/spec/generate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ topic: 'Reliable delivery' }),
      });
      const body = await response.json();

      assert.equal(response.status, 503);
      assert.equal(body.code, 'AI_PROVIDER_NOT_CONFIGURED');
      assert.equal(body.error, 'AI generation is not configured for this environment.');
      assert.equal(typeof body.requestId, 'string');
    });
  } finally {
    if (previousApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousApiKey;
  }
});
