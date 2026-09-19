import assert from 'node:assert/strict';
import test from 'node:test';
import { createProjectWorkspace } from '../src/lib/projectFactory';

test('project factory creates a complete, internally linked workspace', () => {
  const project = createProjectWorkspace('Inventory alerts', 'Notify owners of risky assets', '2026-01-01T00:00:00.000Z');
  assert.equal(project.name, 'Inventory alerts');
  assert.equal(project.createdAt, '2026-01-01T00:00:00.000Z');
  assert.equal(project.spec.title, project.name);
  assert.equal(project.plan.techStack.length, 2);
  assert.equal(project.tasks.tasks[0].id, 'TASK-001');
  assert.equal(project.constitution.rules[0].strictness, 'Mandatory');
});
