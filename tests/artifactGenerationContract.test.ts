import assert from 'node:assert/strict';
import test from 'node:test';
import { artifactFinalValidationContract, artifactWriteProof } from '../src/lib/artifactGenerationContract';

test('every official artifact gets physical-write proof at the transport-safe packet tail', () => {
  for (const path of ['specs/001-example/spec.md', 'specs/001-example/plan.md', 'specs/001-example/tasks.md']) {
    const proof = artifactWriteProof(path);
    assert.match(proof, new RegExp(`test -s '${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`));
    assert.match(proof, /read the file back/i);
  }
});

test('visual requirements are exact, complete, and specific to task artifacts', () => {
  const plan = artifactFinalValidationContract({ kind: 'plan', path: 'specs/001-example/plan.md', requiresVisualContract: true });
  const tasks = artifactFinalValidationContract({ kind: 'tasks', path: 'specs/001-example/tasks.md', requiresVisualContract: true });
  const spec = artifactFinalValidationContract({ kind: 'spec', path: 'specs/001-example/spec.md', requiresVisualContract: true });

  for (const contract of [plan, tasks]) {
    assert.match(contract, /## Visual Acceptance Contract/);
    assert.match(contract, /No Source/);
    assert.match(contract, /desktop plus narrow\/mobile/i);
    assert.match(contract, /contrast\/accessibility/i);
  }
  assert.match(tasks, /T001-style visual-verification task/);
  assert.doesNotMatch(plan, /T001-style visual-verification task/);
  assert.doesNotMatch(spec, /Visual Acceptance Contract/);
});
