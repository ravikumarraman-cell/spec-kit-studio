import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('artifact review keeps technical transcripts collapsed and bounds visible prose', async () => {
  const source = await readFile(new URL('../src/components/common/FeatureArtifactViewer.tsx', import.meta.url), 'utf8');
  assert.match(source, /isTechnicalTranscript/);
  assert.match(source, /Technical evidence, not a decision brief/);
  assert.match(source, /readableSections\.map\(\(section\)/);
  assert.match(source, /MAX_VISIBLE_SECTION_CHARACTERS/);
  assert.match(source, /Inspect retained \{artifactLabel\} source/);
  assert.match(source, /<details open=\{isThoroughReview\} className="feature-artifact-source/);
});
