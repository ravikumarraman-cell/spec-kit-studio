import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('shared error notices use the focus-and-reveal interaction rule', () => {
  const hook = readFileSync(new URL('../src/hooks/useRevealOnChange.ts', import.meta.url), 'utf8');
  assert.match(hook, /prefers-reduced-motion/);
  assert.match(hook, /scrollIntoView/);
  assert.match(hook, /target\.focus/);
});
