import assert from 'node:assert/strict';
import test from 'node:test';
import { HttpError } from '../server/middleware/errorHandling';
import { readIntegrationJson } from '../server/services/integrationClient';

test('GitHub credential failures use a stable reconnect error without exposing upstream content', async () => {
  await assert.rejects(
    () => readIntegrationJson('GitHub', new Response('private provider response', { status: 401 })),
    (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.status, 401);
      assert.equal(error.code, 'GITHUB_RECONNECT_REQUIRED');
      assert.equal(error.message.includes('private provider response'), false);
      return true;
    },
  );
});

test('GitHub organization SSO failures provide only GitHub’s authorization handoff', async () => {
  await assert.rejects(
    () => readIntegrationJson('GitHub', new Response('', {
      status: 403,
      headers: { 'x-github-sso': 'required; url=https://github.com/orgs/optum-eeps/sso?authorization_request=example' },
    })),
    (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.status, 403);
      assert.equal(error.code, 'GITHUB_SSO_AUTHORIZATION_REQUIRED');
      assert.deepEqual(error.details, {
        provider: 'GitHub',
        upstreamStatus: 403,
        ssoAuthorizationUrl: 'https://github.com/orgs/optum-eeps/sso?authorization_request=example',
      });
      return true;
    },
  );
});

test('expired GitHub OAuth credentials offer a safe reconnect action', async () => {
  await assert.rejects(
    () => readIntegrationJson('GitHub', new Response('', { status: 401 })),
    (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.code, 'GITHUB_RECONNECT_REQUIRED');
      assert.match(error.message, /Reconnect GitHub/);
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
