import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { validateStorySpecKitConformance, versionAtLeast } from '../connector/specKitConformance.mjs';

test('compares installed Spec-Kit semantic versions correctly', () => {
  assert.equal(versionAtLeast('specify-cli 1.0.11', '1.0.11'), true);
  assert.equal(versionAtLeast('specify-cli 1.1.0', '1.0.11'), true);
  assert.equal(versionAtLeast('specify-cli 1.0.7', '1.0.11'), false);
});

test('connector accepts only a complete official single-story feature directory', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'speckit-story-'));
  const feature = { scope: 'user-story', slug: '001-export-csv' };
  await fs.mkdir(path.join(root, '.specify'));
  await fs.mkdir(path.join(root, 'specs', feature.slug), { recursive: true });
  await fs.writeFile(path.join(root, 'specs', feature.slug, 'spec.md'), '# Feature Specification: Export CSV\n## User Scenarios & Testing\n### User Story 1 - Export CSV (Priority: P1)\n## Requirements\n### Functional Requirements\n## Success Criteria\n### Measurable Outcomes');
  await fs.writeFile(path.join(root, 'specs', feature.slug, 'plan.md'), '# Implementation Plan: Export CSV\n## Summary\n## Technical Context\n## Constitution Check\n## Project Structure');
  await fs.writeFile(path.join(root, 'specs', feature.slug, 'tasks.md'), '# Tasks: Export CSV\n## Phase 1: Setup\n- [ ] T001 [US1] Implement export in src/export.ts\n## Dependencies & Execution Order\n## Implementation Strategy');
  try {
    assert.deepEqual(await validateStorySpecKitConformance(root, feature, 'specify-cli 1.0.11'), []);
    await fs.appendFile(path.join(root, 'specs', feature.slug, 'spec.md'), '\n### User Story 2 - Delete tenant (Priority: P2)');
    assert.ok((await validateStorySpecKitConformance(root, feature, 'specify-cli 1.0.11')).some((issue) => issue.code === 'story-count'));
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});