import assert from 'node:assert/strict';
import test from 'node:test';
import { personaCatalog } from '../src/lib/personas/catalog';
import { personaHandoffImportCopy } from '../src/components/personas/PersonaHandoffImport';

test('persona handoff import is a clearly named recovery action for every receiving role', () => {
  for (const persona of personaCatalog) {
    const copy = personaHandoffImportCopy(persona.id);
    assert.equal(copy.heading, 'Resume a previously exported Studio handoff');
    assert.match(copy.description, new RegExp(`${persona.label.replace('/', '\\/')} can continue`));
    assert.match(copy.description, /another delivery role or an earlier session/);
  }
});
