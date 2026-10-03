import { FeatureExtractionPackage } from '../api/imports';

/** Safe offline fallback for product intake. It never invents repository facts
 * and produces reviewable Spec-Kit-shaped evidence when cloud AI is absent. */
export function localProductSpecDraft(title: string, source: string): FeatureExtractionPackage {
  const cleanTitle = title.trim() || source.trim().split(/\n+/)[0].replace(/^#\s*/, '').slice(0, 120) || 'Product outcome';
  const summary = source.trim().slice(0, 2_000) || `Clarify the outcome for ${cleanTitle}.`;
  return {
    title: cleanTitle,
    summary,
    sourceContent: source,
    userStories: [{ id: 'US-001', title: cleanTitle, priority: 'High', asA: 'feature user', iWantTo: cleanTitle, soThat: 'the recorded product problem is addressed', acceptanceCriteria: ['A feature owner reviews and accepts the product outcome and acceptance anchors.'] }],
    functionalRequirements: [{ id: 'FR-001', title: `Deliver ${cleanTitle}`, description: 'Implement the accepted product outcome within its recorded scope and non-goals.', category: 'Core', priority: 'High' }],
  };
}
