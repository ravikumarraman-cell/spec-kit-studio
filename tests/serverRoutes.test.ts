import assert from 'node:assert/strict';
import test from 'node:test';
import { createGenerationRouter } from '../server/routes/generationRoutes';
import { createRepositoryRouter } from '../server/routes/repositoryRoutes';
import { createIntegrationRouter } from '../server/routes/integrationRoutes';

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
