import { SecurityResearchPackage } from '../../types/speckit';
import { SecurityResearchArtifactAdapter } from './schema';

type Draft = Omit<SecurityResearchPackage, 'schemaVersion' | 'path' | 'preparedAt' | 'acceptedAt' | 'markdown' | 'specKitProjection'>;
const list = (items: string[]) => items.length ? items.map((item) => `- ${item}`).join('\n') : '- None recorded.';
export function renderSecurityResearchMarkdown(artifact: Draft): string {
  return `# Security research: ${artifact.title}\n\n## Security boundary\n${artifact.securityBoundary}\n\n## Assets\n${list(artifact.assets)}\n\n## Findings\n${artifact.findings.length ? artifact.findings.map((finding) => `- ${finding.id} [${finding.severity}]: ${finding.finding} → ${finding.mitigation}`).join('\n') : '- None recorded.'}\n\n## Required controls\n${list(artifact.requiredControls)}\n\n## Verification\n${list(artifact.verification)}\n\n## Open questions\n${list(artifact.openQuestions)}`;
}
/** Security evidence is companion research for the architecture plan. It must
 * never masquerade as plan.md, which is owned by the technical-design stage. */
export function renderSecurityResearchSpecKitProjection(artifact: Draft): string {
  return `# Security research: ${artifact.title}\n\n## Security boundary\n${artifact.securityBoundary}\n\n## Findings\n${artifact.findings.length ? artifact.findings.map((finding) => `- ${finding.id} [${finding.severity}]: ${finding.finding} → ${finding.mitigation}`).join('\n') : '- None recorded.'}\n\n## Required controls\n${list(artifact.requiredControls)}\n\n## Verification\n${list(artifact.verification)}\n\n## Open questions\n${list(artifact.openQuestions)}`;
}
export function securityResearchIssue(artifact: Draft): string | undefined {
  if (!artifact.securityBoundary.trim()) return 'Describe the security boundary being reviewed.';
  if (!artifact.requiredControls.some(Boolean)) return 'Record at least one required control.';
  if (!artifact.verification.some(Boolean)) return 'State how the required controls will be verified.';
  return undefined;
}
export function createSecurityResearchDraft(title: string, scope: 'feature' | 'user-story', path: string, now: string): SecurityResearchPackage {
  const base: Draft = { title, scope, securityBoundary: 'Confirm the data, identity, and external-service boundaries affected by this delivery scope.', assets: [], findings: [{ id: 'SEC-1', severity: 'medium', finding: 'Repository and deployment assumptions have not yet been verified.', mitigation: 'Validate boundaries and required controls during design review before implementation.' }], requiredControls: ['Preserve least privilege and do not expose credentials or sensitive data in artifacts, logs, or client state.'], verification: ['Review changed trust boundaries and run the relevant security checks before handoff.'], openQuestions: [] };
  const markdown = renderSecurityResearchMarkdown(base);
  return { schemaVersion: 1, path, ...base, preparedAt: now, markdown, specKitProjection: { kind: 'research', path: `specs/${path.split('/')[1] || 'feature'}/research.md`, content: renderSecurityResearchSpecKitProjection(base) } };
}
export const securityResearchArtifactAdapter: SecurityResearchArtifactAdapter = { personaId: 'security-researcher', artifactLabel: 'Security research package', parse: () => undefined, render: (artifact) => artifact.markdown, toEngineArtifact: (artifact) => artifact.specKitProjection };
