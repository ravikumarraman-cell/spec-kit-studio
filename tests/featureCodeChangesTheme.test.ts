import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('feature-code evidence uses semantic theme roles instead of a dark-only gradient', async () => {
  const source = await readFile(new URL('../src/components/prompt/FeatureCodeChanges.tsx', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../src/index.css', import.meta.url), 'utf8');

  assert.match(source, /feature-code-changes/);
  assert.doesNotMatch(source, /from-cyan-500\/\[0\.08\] via-zinc-950 to-violet-500/);
  assert.match(styles, /\.feature-code-changes\s*\{[\s\S]*var\(--theme-info-tint\)/);
  assert.match(styles, /\.feature-code-changes__empty[\s\S]*var\(--theme-surface\)/);
});

test('implementation evidence uses semantic surfaces instead of dark Zinc panels', async () => {
  const history = await readFile(new URL('../src/components/prompt/FeatureImplementationHistory.tsx', import.meta.url), 'utf8');
  const promptStudio = await readFile(new URL('../src/components/prompt/PromptStudio.tsx', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../src/index.css', import.meta.url), 'utf8');

  assert.match(history, /implementation-history__evidence/);
  assert.doesNotMatch(history, /bg-zinc-900\/45|bg-zinc-950\/70/);
  assert.match(promptStudio, /implementation-evidence__summary/);
  assert.match(styles, /\.implementation-history__evidence[\s\S]*var\(--theme-raised\)/);
  assert.match(styles, /\.implementation-evidence\s*\{[\s\S]*var\(--theme-surface\)/);
});
