import assert from 'node:assert/strict';
import test from 'node:test';
import { outcomeRefineryAccess } from '../src/lib/outcomeRefineryAccess.ts';

test('Outcome Refinery permissions are capability-based and keep execution with Developers', () => {
  const product = outcomeRefineryAccess('product-manager');
  const architect = outcomeRefineryAccess('developer', 'architect');
  const developer = outcomeRefineryAccess('developer', 'developer');

  assert.equal(product.canReportGap, true);
  assert.equal(product.canDesignRepair, false);
  assert.equal(product.canExecuteRepair, false);
  assert.equal(architect.canDesignRepair, true);
  assert.equal(architect.canExecuteRepair, false);
  assert.equal(developer.canExecuteRepair, true);
  assert.deepEqual(developer.capabilities, ['report-outcome-gap', 'design-repair', 'execute-repair']);
});

test('Outcome Refinery defaults safely when no role is selected', () => {
  const access = outcomeRefineryAccess();
  assert.equal(access.canReportGap, true);
  assert.equal(access.canExecuteRepair, false);
});
