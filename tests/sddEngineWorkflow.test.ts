import assert from 'node:assert/strict';
import test from 'node:test';
import { createProjectWorkspace } from '../src/lib/projectFactory';
import { validateSddEngineArtifacts } from '../src/lib/sddEngineWorkflow';
import { engineFeatureExportIssues } from '../src/lib/export';

test('GitHub Spec Kit validation remains strict behind the SDD engine seam', () => {
  const project = createProjectWorkspace('Export CSV', 'Export data');
  const feature = { id: 'F-1', title: 'Export CSV', summary: 'Export data', source: 'text' as const, importedAt: '', requirementIds: [], userStoryIds: [], taskIds: [], slug: '001-export-csv' };
  const issues = validateSddEngineArtifacts(project, feature, [{ path: 'specs/001-export-csv/spec.md', kind: 'spec', content: '# Incomplete' }], ['spec']);
  assert.ok(issues.some((issue) => issue.code === 'spec-structure'));
});

test('engine package export follows the selected adapter and fails closed for an unavailable engine', () => {
  const project = createProjectWorkspace('Export CSV', 'Export data');
  project.sddEngine = 'openspec';
  const feature = { id: 'F-1', title: 'Export CSV', summary: 'Export data', source: 'text' as const, importedAt: '', requirementIds: [], userStoryIds: [], taskIds: [], slug: '001-export-csv', specification: { path: 'specs/001-export-csv/spec.md', content: '# Feature Specification: Export CSV\n## User Scenarios & Testing\n### User Story 1 - Export (Priority: P1)\n## Requirements\n### Functional Requirements\n- **FR-001**: System MUST export CSV.\n## Success Criteria\n### Measurable Outcomes\n- **SC-001**: CSV exports.', acceptedAt: '2026-10-02T00:00:00.000Z' }, architecturePlan: { path: 'specs/001-export-csv/plan.md', content: '# Implementation Plan: Export CSV\n## Summary\n## Technical Context\n## Constitution Check\n## Project Structure', acceptedAt: '2026-10-02T00:00:00.000Z' }, deliveryPlan: { path: 'specs/001-export-csv/tasks.md', content: '# Tasks: Export CSV\n## Phase 1: Setup\n- [ ] T001 [US1] Export in src/export.ts\n## Dependencies & Execution Order\n## Implementation Strategy', acceptedAt: '2026-10-02T00:00:00.000Z' } };
  assert.deepEqual(engineFeatureExportIssues(project, feature), [{ code: 'engine-adapter-unavailable', message: 'The selected SDD engine does not have a verified connector adapter yet.' }]);
});
