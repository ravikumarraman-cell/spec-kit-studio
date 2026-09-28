import assert from 'node:assert/strict';
import test from 'node:test';
import { HttpError } from '../server/middleware/errorHandling';
import { readIntegrationJson } from '../server/services/integrationClient';

test('integration authentication failures use a stable typed error', async () => {
  await assert.rejects(
    () => readIntegrationJson('GitHub', new Response('private provider response', { status: 401 })),
    (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.status, 401);
      assert.equal(error.code, 'GITHUB_AUTH_FAILED');
      assert.equal(error.message.includes('private provider response'), false);
      return true;
    },
  );
});

test('integration server failures do not expose upstream response bodies', async () => {
  await assert.rejects(
    () => readIntegrationJson('Jira', new Response('secret diagnostic payload', { status: 500 })),
    (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.status, 502);
      assert.equal(error.code, 'JIRA_UPSTREAM_ERROR');
      assert.equal(error.message.includes('secret diagnostic payload'), false);
      return true;
    },
  );
});

test('integration success responses must contain valid JSON', async () => {
  await assert.rejects(
    () => readIntegrationJson('GitHub', new Response('not-json', { status: 200 })),
    (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.status, 502);
      assert.equal(error.code, 'INTEGRATION_INVALID_RESPONSE');
      return true;
    },
  );
});