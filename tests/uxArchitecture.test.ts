import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { personaConsumptionRules } from '../src/lib/personas/consumption';
import { personaDefinitions } from '../src/lib/personas/registry';

function sourceFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => entry.isDirectory()
    ? sourceFiles(join(root, entry.name))
    : /\.(?:ts|tsx)$/.test(entry.name) ? [join(root, entry.name)] : []);
}

test('Studio source never uses native blocking browser dialogs', () => {
  const violations = sourceFiles(new URL('../src', import.meta.url).pathname)
    .flatMap((path) => readFileSync(path, 'utf8').split('\n').map((line, index) => ({ path, line, index })))
    .filter(({ line }) => /\b(?:window\.)?(?:alert|confirm|prompt)\s*\(/.test(line));
  assert.deepEqual(violations, []);
});

test('every persona participates in the reusable consumption policy', () => {
  for (const persona of personaDefinitions) {
    assert.ok(personaConsumptionRules.some((rule) => rule.consumer === persona.id || rule.source === persona.id));
  }
  assert.ok(personaConsumptionRules.some((rule) => rule.consumer === 'engine'));
});
