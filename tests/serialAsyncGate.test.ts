import assert from 'node:assert/strict';
import test from 'node:test';
import { createSerialAsyncGate } from '../src/lib/serialAsyncGate';

test('serial async gate skips overlapping refreshes and resumes after completion', async () => {
  let resolveFirst: (() => void) | undefined;
  let calls = 0;
  const gate = createSerialAsyncGate(async () => {
    calls += 1;
    await new Promise<void>((resolve) => { resolveFirst = resolve; });
  });
  const first = gate();
  assert.equal(await gate(), false);
  assert.equal(calls, 1);
  resolveFirst?.();
  assert.equal(await first, true);

  const second = gate();
  assert.equal(calls, 2);
  resolveFirst?.();
  assert.equal(await second, true);
});
