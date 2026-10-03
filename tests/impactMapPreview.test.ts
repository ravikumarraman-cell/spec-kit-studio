import assert from 'node:assert/strict';
import test from 'node:test';
import { impactMapSections } from '../src/components/common/ImpactMapPreview';

test('impact-map preview turns retained Markdown into a compact decision digest', () => {
  const sections = impactMapSections(`# Impact map

## Owning code paths
- src/components/TenantSummary.tsx
- src/lib/tenantHealth.ts

## APIs and dependencies
- Reuse the tenant health client contract.

## Guardrails and risks
- Preserve read-only access controls.

## Verification
- Extend the focused tenant summary test.`);

  assert.deepEqual(sections.map((section) => section.area), ['ownership', 'dependencies', 'guardrails', 'verification']);
  assert.equal(sections[0].items[0], 'src/components/TenantSummary.tsx');
  assert.equal(sections[3].items[0], 'Extend the focused tenant summary test.');
});
