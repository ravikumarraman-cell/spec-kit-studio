import assert from 'node:assert/strict';
import test from 'node:test';

test('connector HTTP protocol redacts common credential forms', async () => {
  const { redactSensitiveOutput } = await import('../connector/httpProtocol.mjs');
  const output = redactSensitiveOutput('Authorization: bearer abc123 token=secret-value sk-abcdefghijklmnop');

  assert.doesNotMatch(output, /secret-value|sk-abcdefghijklmnop/);
  assert.match(output, /REDACTED/);
});

test('connector HTTP protocol rejects oversized JSON bodies before parsing', async () => {
  const { parseJsonBody } = await import('../connector/httpProtocol.mjs');
  const request = { async *[Symbol.asyncIterator]() { yield Buffer.from('{"large":"payload"}'); } } as any;

  await assert.rejects(parseJsonBody(request, 5), /Request is too large/);
});
