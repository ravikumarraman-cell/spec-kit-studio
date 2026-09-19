import assert from 'node:assert/strict';
import test from 'node:test';
import { createImportedRepository } from '../src/lib/repositoryImportFactory';

test('repository import factory completes sparse AI analysis with safe defaults', () => {
  const repository = createImportedRepository({}, '', '2026-01-01T00:00:00.000Z');
  assert.equal(repository.repoName, 'Imported Codebase');
  assert.equal(repository.primaryLanguage, 'TypeScript');
  assert.equal(repository.keyDirectories[0], '/src');
  assert.equal(repository.suggestedNewFeatures.length, 4);
});

test('repository import factory preserves analysis and gives technologies stable IDs', () => {
  const repository = createImportedRepository({
    repoName: 'Payments', primaryLanguage: 'Go', detectedTechStack: [{
      id: '', category: 'Backend', name: 'Fiber', confidence: 'Medium', fileEvidence: 'go.mod', selectedForNewFeature: false,
    }],
  }, 'https://github.com/acme/payments', '2026-01-02T00:00:00.000Z');
  assert.equal(repository.repoName, 'Payments');
  assert.equal(repository.detectedTechStack[0].id, 'TECH-1');
  assert.equal(repository.detectedTechStack[0].selectedForNewFeature, true);
});
