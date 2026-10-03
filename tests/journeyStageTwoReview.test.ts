import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Stage 2 presents scoped source, stories, requirements, and an explicit review action before confirmation', async () => {
  const source = await readFile(new URL('../src/components/journey/FeatureJourney.tsx', import.meta.url), 'utf8');
  assert.match(source, /function ImportedFeatureReview/);
  assert.match(source, /Review imported feature details/);
  assert.match(source, /Open feature review/);
  assert.match(source, /View retained source brief/);
  assert.match(source, /User stories · \{stories\.length\}/);
  assert.match(source, /Requirements · \{requirements\.length\}/);
  assert.match(source, /onOpenSpec=\{\(\) => onNavigate\('spec'\)\}/);
});
