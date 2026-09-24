import assert from 'node:assert/strict';
import test from 'node:test';
import { createStoryInboxItem } from '../src/lib/featureInbox';
import { isCanonicalSpecKitFeatureSlug, officialFeatureDirectoryFromSpecPath, specKitFeatureSlug, validateSpecKitArtifacts } from '../src/lib/specKitCompliance';

const story = { id: 'US-101', title: 'Export CSV', priority: 'High' as const, asA: 'Analyst', iWantTo: 'export inventory', soThat: 'I can review it offline', acceptanceCriteria: ['CSV downloads.'] };
const requirement = { id: 'FR-101', title: 'Export CSV', description: 'generate a CSV file', category: 'Core' as const, priority: 'High' as const };
const item = createStoryInboxItem(story, [requirement], 'text', 0, undefined, '2026-09-24T00:00:00.000Z');

const artifacts = [
  { path: 'specs/001-export-csv/spec.md', kind: 'spec', content: '# Feature Specification: Export CSV\n## User Scenarios & Testing\n### User Story 1 - Export CSV (Priority: P1)\n## Requirements\n### Functional Requirements\n## Success Criteria\n### Measurable Outcomes' },
  { path: 'specs/001-export-csv/plan.md', kind: 'plan', content: '# Implementation Plan: Export CSV\n## Summary\n## Technical Context\n## Constitution Check\n## Project Structure' },
  { path: 'specs/001-export-csv/tasks.md', kind: 'tasks', content: '# Tasks: Export CSV\n## Phase 1: Setup\n- [ ] T001 [US1] Implement export in src/export.ts\n## Dependencies & Execution Order\n## Implementation Strategy' },
];

test('creates official numbered Spec-Kit feature identities for stories', () => {
  assert.equal(specKitFeatureSlug('Export CSV', 1), '001-export-csv');
  assert.equal(specKitFeatureSlug('Export CSV', 1004), '1004-export-csv');
  assert.equal(isCanonicalSpecKitFeatureSlug(item.slug), true);
});

test('adopts only canonical official specification directories', () => {
  assert.equal(officialFeatureDirectoryFromSpecPath('/repo/specs/027-export-csv/spec.md'), '027-export-csv');
  assert.equal(officialFeatureDirectoryFromSpecPath('specs/export-csv/spec.md'), undefined);
  assert.equal(officialFeatureDirectoryFromSpecPath('specs/027-export-csv/plan.md'), undefined);
});

test('accepts a complete single-story Spec-Kit artifact set', () => {
  assert.deepEqual(validateSpecKitArtifacts(item, artifacts), []);
});

test('rejects sibling stories, missing structure, and untraced tasks', () => {
  const invalid = artifacts.map((artifact) => ({ ...artifact }));
  invalid[0].content += '\n### User Story 2 - Delete tenant (Priority: P2)';
  invalid[0].content += '\n[NEEDS CLARIFICATION: export format]';
  invalid[1].content = '# Implementation Plan: Export CSV\n[FEATURE NAME]';
  invalid[2].content = '# Tasks: Export CSV\n## Phase 1: Setup\n- [ ] T001 Implement export\n## Dependencies & Execution Order\n## Implementation Strategy';
  const codes = validateSpecKitArtifacts(item, invalid).map((issue) => issue.code);
  assert.ok(codes.includes('story-count'));
  assert.ok(codes.includes('spec-clarification'));
  assert.ok(codes.includes('plan-structure'));
  assert.ok(codes.includes('plan-placeholder'));
  assert.ok(codes.includes('task-traceability'));
});