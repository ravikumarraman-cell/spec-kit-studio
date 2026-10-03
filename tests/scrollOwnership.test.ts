import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('application shell has one explicit, independently scrollable workspace viewport', async () => {
  const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
  const css = await readFile(new URL('../src/index.css', import.meta.url), 'utf8');

  assert.match(app, /h-dvh min-h-screen[^\n]*overflow-hidden/);
  assert.match(app, /flex-1 min-h-0 flex flex-col/);
  assert.match(app, /flex-1 min-h-0 min-w-0 overscroll-contain[^\n]*overflow-y-auto/);
  assert.doesNotMatch(css, /body\s*\{\s*overscroll-behavior-y:\s*none;/);
});
