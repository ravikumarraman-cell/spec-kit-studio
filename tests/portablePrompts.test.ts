import assert from 'node:assert/strict';
import test from 'node:test';
import { portableTaskPrompt } from '../src/lib/portablePrompts';
import { createProjectWorkspace } from '../src/lib/projectFactory';

test('portable prompt includes task, constitution, and evidence', () => {
  const project = createProjectWorkspace('Example', 'Example project');
  const prompt = portableTaskPrompt(project, project.tasks.tasks[0], 'copilot', ['src/app.tsx']);
  assert.match(prompt, /TASK-001/);
  assert.match(prompt, /explicitly typed/);
  assert.match(prompt, /src\/app.tsx/);
});
