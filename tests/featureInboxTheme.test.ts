import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('delivery-item intake uses semantic theme surfaces instead of the dark-only Zinc empty state', async () => {
  const source = await readFile(new URL('../src/components/journey/FeatureInbox.tsx', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../src/index.css', import.meta.url), 'utf8');
  assert.match(source, /feature-inbox__empty/);
  assert.doesNotMatch(source, /bg-zinc-950\/40/);
  assert.match(styles, /\.feature-inbox\s*\{[\s\S]*var\(--theme-info-tint\)/);
  assert.match(styles, /\.feature-inbox__empty\s*\{[\s\S]*var\(--theme-raised\)/);
  assert.match(styles, /\.feature-inbox__copy\s*\{[\s\S]*var\(--theme-muted\)/);
});
