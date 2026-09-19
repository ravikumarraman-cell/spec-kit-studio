import assert from 'node:assert/strict';
import test from 'node:test';
import { createProjectWorkspace } from '../src/lib/projectFactory';
import { createWorkspaceFiles } from '../src/lib/workspaceFiles';
import { requireArray, requireObjectField, requireString, requireSuccessEnvelope } from '../src/lib/api/guards';

test('workspace artifact export stays confined to Studio paths', () => {
  const files = createWorkspaceFiles(createProjectWorkspace('Example', 'Example project'));
  assert.ok(files.length > 0);
  assert.ok(files.every((file) => file.path.startsWith('.specify/studio/')));
  assert.ok(files.some((file) => file.path.endsWith('spec.md')));
});

test('API envelope guard rejects failed or malformed server data', () => {
  assert.throws(() => requireSuccessEnvelope({ success: false, error: 'nope' }), /nope/);
  assert.throws(() => requireSuccessEnvelope([]), /expected an object/);
  assert.equal(requireSuccessEnvelope({ success: true }).success, true);
});

test('API contract guards reject malformed required response fields', () => {
  assert.throws(() => requireString(42, 'message'), /message/);
  assert.throws(() => requireArray({}, 'repos'), /repos/);
  assert.throws(() => requireObjectField({ success: true }, 'data'), /data/);
  assert.deepEqual(requireArray(['one'], 'repos'), ['one']);
});
