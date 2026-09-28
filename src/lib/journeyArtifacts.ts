import { FeatureInboxItem, SpecKitProject } from '../types/speckit';

/** Parses only the connector's explicit official-artifact envelope. */
export function officialArtifactFromAgentOutput(output: string): { path: string; content: string } | null {
  const match = output.match(/--- Official ([^\n]+) ---\n([\s\S]+)$/);
  return match ? { path: match[1].trim(), content: match[2].trim() } : null;
}

/** Preserves legacy plan evidence without treating it as a regenerated artifact. */
export function legacyArchitectureSnapshot(project: SpecKitProject, feature: FeatureInboxItem): string {
  const sharedPlan = project.plan.markdown?.trim() || project.plan.architectureSummary?.trim() || 'No separate workspace plan text was retained.';
  return `# ${feature.title} — recovered legacy architecture context

> Recovered by Studio from the approved shared workspace architecture record. This is historical context for this feature; it was not regenerated and does not change repository files.

## Feature summary

${feature.summary}

## Shared architecture snapshot

${sharedPlan}`;
}
