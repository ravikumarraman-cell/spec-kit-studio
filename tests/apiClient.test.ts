import assert from 'node:assert/strict';
import test from 'node:test';
import { postApi, StudioApiError } from '../src/lib/api/client';

const originalFetch = globalThis.fetch;

test.afterEach(() => {
  globalThis.fetch = originalFetch;
});

test('postApi preserves server error metadata for support and retry decisions', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({
    success: false,
    error: 'Service is temporarily unavailable.',
    code: 'UPSTREAM_UNAVAILABLE',
    requestId: 'request-123',
  }), {
    status: 503,
    headers: { 'content-type': 'application/json', 'x-request-id': 'request-123' },
  });

  await assert.rejects(
    postApi('/api/test', {}, () => ({ ok: true })),
    (error: unknown) => {
      assert.ok(error instanceof StudioApiError);
      assert.equal(error.status, 503);
      assert.equal(error.code, 'UPSTREAM_UNAVAILABLE');
      assert.equal(error.requestId, 'request-123');
      assert.equal(error.retryable, true);
      return true;
    },
  );
});

test('postApi does not classify client errors as retryable', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ success: false, error: 'Invalid input.' }), { status: 400 });

  await assert.rejects(
    postApi('/api/test', {}, () => ({ ok: true })),
    (error: unknown) => error instanceof StudioApiError && error.status === 400 && !error.retryable,
  );
});

test('postApi identifies unreadable server responses', async () => {
  globalThis.fetch = async () => new Response('not json', {
    status: 502,
    headers: { 'x-request-id': 'request-456' },
  });

  await assert.rejects(
    postApi('/api/test', {}, () => ({ ok: true })),
    (error: unknown) => error instanceof StudioApiError
      && error.code === 'INVALID_RESPONSE'
      && error.requestId === 'request-456',
  );
});

test('postApi distinguishes network failures', async () => {
  globalThis.fetch = async () => { throw new TypeError('fetch failed'); };

  await assert.rejects(
    postApi('/api/test', {}, () => ({ ok: true })),
    (error: unknown) => error instanceof StudioApiError
      && error.code === 'NETWORK_ERROR'
      && error.retryable,
  );
});