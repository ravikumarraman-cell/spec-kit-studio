import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('plan, artifact, and recovery disclosures use semantic surfaces rather than dark utility opacity variants', async () => {
  const [plan, artifact, prompt, css] = await Promise.all([
    readFile(new URL('../src/components/plan/PlanEditor.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/common/FeatureArtifactViewer.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/prompt/PromptStudio.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/index.css', import.meta.url), 'utf8'),
  ]);

  assert.match(plan, /plan-shared-architecture/);
  assert.doesNotMatch(plan, /bg-zinc-900\/35/);
  assert.match(artifact, /feature-artifact-source/);
  assert.doesNotMatch(artifact, /bg-zinc-950\/50/);
  assert.match(prompt, /implementation-recovery/);
  assert.doesNotMatch(prompt, /bg-zinc-900\/35/);
  assert.match(css, /\.feature-artifact-source,[\s\S]*background-color: var\(--theme-surface\)/);
  assert.match(css, /\.plan-shared-architecture__copy \{ color: var\(--theme-muted\); \}/);
  assert.match(css, /\.implementation-recovery \{[\s\S]*background-color: var\(--theme-inset\)/);
});
