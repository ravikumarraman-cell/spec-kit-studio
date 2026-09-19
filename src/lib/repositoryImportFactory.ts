import { ImportedRepository } from '../types/speckit';

const defaultFeatures = [
  'Add Role-Based Access Control (RBAC) & OAuth 2.0',
  'Add Real-time WebSockets Live Notifications',
  'Add AI Model Integration & Vector Search',
  'Add Stripe Billing & Subscription Management',
];

/** Normalizes partial AI analysis into the complete repository model used by the import UI. */
export function createImportedRepository(
  analysis: Partial<ImportedRepository>,
  repoUrl: string,
  importedAt = new Date().toISOString(),
): ImportedRepository {
  return {
    repoUrl: repoUrl || 'https://github.com/imported-project/repo',
    repoName: analysis.repoName || 'Imported Codebase',
    description: analysis.description || 'Imported repository for feature extension.',
    primaryLanguage: analysis.primaryLanguage || 'TypeScript',
    detectedTechStack: (analysis.detectedTechStack || []).map((tech, index) => ({
      id: tech.id || `TECH-${index + 1}`,
      category: tech.category || 'Other', name: tech.name || 'Technology', version: tech.version || '',
      confidence: tech.confidence || 'High', fileEvidence: tech.fileEvidence || 'Manifest file', selectedForNewFeature: true,
    })),
    architectureSummary: analysis.architectureSummary || 'Standard layered architecture.',
    keyDirectories: analysis.keyDirectories || ['/src', '/api', '/components'],
    suggestedNewFeatures: analysis.suggestedNewFeatures || defaultFeatures,
    importedAt,
  };
}
