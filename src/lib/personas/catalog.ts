import { PersonaId } from '../../types/speckit';

export interface PersonaCatalogEntry {
  id: PersonaId;
  label: string;
  home: 'journey';
  changesCode: false;
  nextAction: string;
  summary: string;
  prerequisite?: 'repository-evidence';
}

/** The sole metadata extension point for a Studio persona. An adapter and a
 * screen can be added independently, while all navigation copy stays aligned. */
export const personaCatalog: readonly PersonaCatalogEntry[] = [
  { id: 'product-manager', label: 'Product Manager', home: 'journey', changesCode: false, nextAction: 'Resume outcome definition', summary: 'Define a reviewable outcome and product handoff.' },
  { id: 'business-analyst', label: 'Business Analyst', home: 'journey', changesCode: false, nextAction: 'Resume business analysis', summary: 'Clarify scope and acceptance evidence.' },
  { id: 'developer', label: 'Developer / Architect', home: 'journey', changesCode: false, nextAction: 'Resume technical approach', summary: 'Use connected repository evidence to shape a technical handoff.', prerequisite: 'repository-evidence' },
  { id: 'security-researcher', label: 'Security Researcher', home: 'journey', changesCode: false, nextAction: 'Resume security review', summary: 'Capture required controls and verification evidence.' },
];

export function personaCatalogEntry(id: PersonaId): PersonaCatalogEntry {
  const entry = personaCatalog.find((candidate) => candidate.id === id);
  if (!entry) throw new Error(`Unknown Studio persona: ${id}`);
  return entry;
}
