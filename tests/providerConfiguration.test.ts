import assert from 'node:assert/strict';
import test from 'node:test';
import { providerOptions } from '../src/lib/providerConfiguration';

test('provider options always include a credential-free safe default', () => {
  assert.equal(providerOptions[0].id, 'templates');
  assert.ok(providerOptions.some((option) => option.id === 'github'));
  assert.ok(providerOptions.some((option) => option.id === 'gitlab'));
});
