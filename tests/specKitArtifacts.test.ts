import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { readSpecKitArtifacts } from '../connector/specKitArtifacts.mjs';

test('reads official artifacts directly even when a repository has more files than a generic scan budget', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'spec-kit-artifacts-'));
  try {
    await Promise.all(Array.from({ length: 5_100 }, (_, index) => writeFile(path.join(root, `application-${index}.txt`), 'ignored')));
    await mkdir(path.join(root, 'specs', '004-feature'), { recursive: true });
    await writeFile(path.join(root, 'specs', '004-feature', 'spec.md'), '# Feature\n\n## User Stories\n');
    const { artifacts } = await readSpecKitArtifacts(root);
    assert.deepEqual(artifacts.map((artifact) => artifact.path), ['specs/004-feature/spec.md']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
