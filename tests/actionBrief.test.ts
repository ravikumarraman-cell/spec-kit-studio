import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

test('Action Brief keeps workflow explanations available without hover', () => {
  const component = source('../src/components/common/ActionBrief.tsx');
  assert.match(component, /What will happen\?/);
  assert.match(component, /Creates/);
  assert.match(component, /Does not/);
  assert.match(component, /Next/);
  assert.match(component, /ProgressiveDisclosure/);
});

test('consequential CTA families use the shared Action Brief', () => {
  for (const path of [
    '../src/components/import/DeliveryIntakeAction.tsx',
    '../src/components/journey/FeatureJourney.tsx',
    '../src/components/personas/PersonaLifecycleCard.tsx',
    '../src/components/personas/PersonaDraftActions.tsx',
    '../src/components/personas/PersonaAgentOption.tsx',
  ]) assert.match(source(path), /ActionBrief/);
});

test('persona action explanations use the full card width instead of constraining the heading', () => {
  const card = readFileSync(new URL('../src/components/personas/PersonaLifecycleCard.tsx', import.meta.url), 'utf8');
  assert.match(card, /\{primaryAction && <div className="shrink-0">\{primaryAction\}<\/div>\}/);
  assert.match(card, /\{actionBrief && <ActionBrief className="mt-4" brief=\{actionBrief\} \/>\}/);
});
