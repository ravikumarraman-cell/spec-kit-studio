import assert from 'node:assert/strict';
import test from 'node:test';
import { featureImportDestination } from '../src/lib/featureImportRouting';

test('feature intake always targets its active workspace when one is available', () => {
  assert.equal(featureImportDestination(true, true), 'active-workspace');
});

test('standalone intake creates a workspace only when no active workspace can receive the feature', () => {
  assert.equal(featureImportDestination(false, false), 'new-workspace');
  assert.equal(featureImportDestination(true, false), 'new-workspace');
});
