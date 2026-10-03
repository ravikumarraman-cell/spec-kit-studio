import assert from 'node:assert/strict';
import test from 'node:test';
import { SDD_ENGINES, sddEngine } from '../src/lib/sddEngines';

test('SDD engine registry keeps GitHub Spec Kit available while alternatives remain future-facing', () => {
  assert.deepEqual(SDD_ENGINES.map((engine) => engine.id), ['github-spec-kit', 'openspec', 'bmad-method', 'tessl', 'kiro']);
  assert.equal(sddEngine('github-spec-kit').strictConformance, true);
  assert.equal(sddEngine('github-spec-kit').availability, 'available');
  assert.equal(sddEngine('openspec').strictConformance, false);
  assert.equal(sddEngine('openspec').availability, 'coming-soon');
  assert.equal(sddEngine(undefined).id, 'github-spec-kit');
});
