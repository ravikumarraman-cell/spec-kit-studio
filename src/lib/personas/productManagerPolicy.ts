import { FeatureInboxItem } from '../../types/speckit';
import { PersonaRecommendation } from './schema';

/** Pure, explainable policy. It never starts an agent or changes feature state. */
export function productManagerRecommendation(feature: FeatureInboxItem | undefined): PersonaRecommendation {
  if (!feature) return { personaId: 'product-manager', engagement: 'not-applicable', title: 'Product outcome', reason: 'Select a feature before preparing product evidence.', creates: [], changesCode: false };
  if (feature.productOutcome?.acceptedAt) return { personaId: 'product-manager', engagement: 'complete', title: 'Product outcome reviewed', reason: 'The approved product package will be included in developer planning.', creates: ['Product brief', 'Decision log', 'Developer handoff'], changesCode: false };
  if (feature.productManagerDecision?.status === 'skipped') return { personaId: 'product-manager', engagement: 'skipped', title: 'Product discovery skipped', reason: feature.productManagerDecision.reason || 'The feature owner recorded that existing evidence is sufficient.', creates: [], changesCode: false };
  return {
    personaId: 'product-manager', engagement: 'recommended', title: 'Clarify the product outcome',
    reason: 'A short feature request benefits from explicit users, success measures, scope boundaries, and product decisions before technical planning.',
    creates: ['Product brief', 'Decision log', 'Developer handoff'], changesCode: false,
  };
}
