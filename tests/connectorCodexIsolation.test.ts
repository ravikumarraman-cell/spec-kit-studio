import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('connector isolates non-interactive Codex runs from user configuration by default', async () => {
  const source = await readFile(new URL('../connector/server.mjs', import.meta.url), 'utf8');
  assert.match(source, /CODEX_IGNORE_USER_CONFIG = process\.env\.STUDIO_CODEX_IGNORE_USER_CONFIG !== 'false'/);
  assert.match(source, /\['--ignore-user-config'\]/);
  assert.match(source, /STUDIO_CODEX_IGNORE_USER_CONFIG/);
});
