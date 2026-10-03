import JSZip from 'jszip';
import { BusinessAnalysisPackage, DeveloperArchitecturePackage, FeatureInboxItem, FunctionalRequirement, PersonaDecisionReceipt, PersonaId, ProductOutcomePackage, SddEngineArtifactKind, SecurityResearchPackage, SpecKitProject, UserStory } from '../../types/speckit';
import { acceptedPersonaArtifact } from './consumption';
import { engineProjectionIssue } from './specKitProjection';
import { selectedEngineContract } from '../sddEngineWorkflow';
import { REVIEWED_DELIVERY_MANIFEST, REVIEWED_DELIVERY_SOURCE_PATH, reviewedDeliveryHandoffPackage } from './reviewedDeliveryHandoff';

const HANDOFF_FILE = 'studio-persona-handoff.json';
const MAX_HANDOFF_BYTES = 1_000_000;

export type StudioHandoffPackageType = 'studio-persona-handoff' | 'studio-reviewed-delivery-handoff';
export interface StudioHandoffImportRule {
  packageType: StudioHandoffPackageType;
  manifestPath: string;
  label: string;
  /** Each package validates only the canonical engine evidence it can prove. */
  requiredEngineArtifact?: SddEngineArtifactKind;
  missingEvidenceMessage: string;
}

/** One import contract for every portable Studio handoff. Add a format here
 * before exposing it in the UI; readers and restore code then fail closed. */
export const studioHandoffImportRules: Readonly<Record<StudioHandoffPackageType, StudioHandoffImportRule>> = {
  'studio-persona-handoff': { packageType: 'studio-persona-handoff', manifestPath: HANDOFF_FILE, label: 'persona handoff', missingEvidenceMessage: 'The handoff manifest is incomplete. Download the complete Studio handoff again.' },
  'studio-reviewed-delivery-handoff': { packageType: 'studio-reviewed-delivery-handoff', manifestPath: REVIEWED_DELIVERY_MANIFEST, label: 'reviewed-delivery handoff', requiredEngineArtifact: 'spec', missingEvidenceMessage: 'This reviewed-delivery handoff is missing its accepted canonical spec.md. Download the complete Studio handoff again.' },
};

export function studioHandoffImportRule(packageType: StudioHandoffPackageType): StudioHandoffImportRule { return studioHandoffImportRules[packageType]; }

export interface PortablePersonaHandoff {
  schemaVersion: 1;
  packageType: 'studio-persona-handoff';
  exportedAt: string;
  engine: { id: string; label: string; version: string };
  feature: { id: string; title: string; summary: string; slug?: string; scope?: FeatureInboxItem['scope'] };
  artifact: { personaId: PersonaId; path: string; markdown: string; specKitProjection: { kind: SddEngineArtifactKind; path: string; content: string }; payload: unknown };
  /** Every additional text file is declared in the manifest so a ZIP reader
   * can prove that what it imports is exactly what was reviewed at export. */
  supportingFiles?: PersonaHandoffSupportingFile[];
  continuation?: PortableArchitectureContinuation;
}

/** PM-reviewed imported delivery is a first-class portable handoff, not a
 * Product Brief masquerading as one. Keep its format explicit and bounded. */
export interface PortableReviewedDeliveryHandoff {
  schemaVersion: 1;
  packageType: 'studio-reviewed-delivery-handoff';
  exportedAt: string;
  engine: { id: string; label: string; version: string };
  feature: { id: string; title: string; summary: string; slug?: string; scope?: FeatureInboxItem['scope'] };
  review: PersonaDecisionReceipt;
  sourceContent?: string;
  specification?: { path: string; content: string; acceptedAt: string };
  delivery?: { userStories: UserStory[]; functionalRequirements: FunctionalRequirement[] };
}

export type StudioPortableHandoff = PortablePersonaHandoff | PortableReviewedDeliveryHandoff;

export interface PortableArchitectureContinuation {
  kind: 'accepted-architecture';
  creditedStages: [2, 3, 4];
  specification: { path: string; content: string; acceptedAt: string };
  impactMap: { path: 'evidence/accepted-impact-map.md'; content: string; acceptedAt: string };
  architecturePlan: { path: string; archivePath: 'evidence/accepted-architecture-plan.md'; content: string; acceptedAt: string };
}

export type PortablePersonaArtifact = ProductOutcomePackage | BusinessAnalysisPackage | DeveloperArchitecturePackage | SecurityResearchPackage;

export interface PersonaHandoffSupportingFile { path: string; content: string; }

function architectureContinuation(project: SpecKitProject, feature: FeatureInboxItem, personaId: PersonaId): PortableArchitectureContinuation | undefined {
  const journey = project.journey?.featureId === feature.id ? project.journey : undefined;
  const { specification, impactMap, architecturePlan } = feature;
  if (personaId !== 'developer' || feature.technicalRole !== 'architect' || ![1, 2, 3, 4].every((stage) => journey?.completedStages.includes(stage))) return undefined;
  if (!specification?.path || !specification.content || !specification.acceptedAt || !impactMap?.content || !impactMap.acceptedAt || !architecturePlan?.path || !architecturePlan.content || !architecturePlan.acceptedAt) return undefined;
  return {
    kind: 'accepted-architecture', creditedStages: [2, 3, 4],
    specification: { path: specification.path, content: specification.content, acceptedAt: specification.acceptedAt },
    impactMap: { path: 'evidence/accepted-impact-map.md', content: impactMap.content, acceptedAt: impactMap.acceptedAt },
    architecturePlan: { path: architecturePlan.path, archivePath: 'evidence/accepted-architecture-plan.md', content: architecturePlan.content, acceptedAt: architecturePlan.acceptedAt },
  };
}

/** Small, explicit supporting evidence makes a technical handoff useful to a
 * receiving developer without smuggling a repository, secrets, or execution
 * state into the portable ZIP. */
export function personaHandoffSupportingFiles(project: SpecKitProject, feature: FeatureInboxItem, personaId: PersonaId): PersonaHandoffSupportingFile[] {
  if (personaId !== 'developer' || feature.technicalRole !== 'architect') return [];
  const files: PersonaHandoffSupportingFile[] = [];
  if (feature.specification?.acceptedAt && feature.specification.path && feature.specification.content) files.push({ path: feature.specification.path, content: feature.specification.content });
  if (feature.architecturePlan?.acceptedAt && feature.architecturePlan.path && feature.architecturePlan.content) files.push({ path: 'evidence/accepted-architecture-plan.md', content: feature.architecturePlan.content });
  if (feature.impactMap?.acceptedAt && feature.impactMap.content) files.push({ path: 'evidence/accepted-impact-map.md', content: feature.impactMap.content });
  if (feature.securityResearch?.acceptedAt) files.push({ path: feature.securityResearch.path, content: feature.securityResearch.markdown });
  const primaryPaths = new Set([feature.developerArchitecture?.path, feature.developerArchitecture?.specKitProjection.path].filter(Boolean));
  return files.filter((file, index, all) => file.content.length <= 250_000 && !primaryPaths.has(file.path) && all.findIndex((candidate) => candidate.path === file.path) === index).slice(0, 4);
}

export function personaHandoffArchivePaths(artifact: Pick<PortablePersonaHandoff['artifact'], 'path' | 'specKitProjection'>, supportingFiles: readonly PersonaHandoffSupportingFile[] = []): string[] {
  return [...new Set([HANDOFF_FILE, 'README.md', artifact.path, artifact.specKitProjection.path, ...supportingFiles.map((file) => file.path)])];
}

function isPersonaId(value: unknown): value is PersonaId {
  return value === 'product-manager' || value === 'business-analyst' || value === 'developer' || value === 'security-researcher';
}

function archiveEntryIssue(zip: JSZip, path: string, expectedContent: string): Promise<string | undefined> {
  const entry = zip.file(path);
  if (!entry) return Promise.resolve(`The handoff evidence at ${path} is missing.`);
  return entry.async('string').then((content) => content === expectedContent ? undefined : `The handoff evidence at ${path} does not match its manifest.`);
}

/** Shared export gate for every persona. Persona-specific UI may decide when
 * to offer download, but it cannot bypass engine validation or archive-safe
 * evidence rules here. */
export function personaHandoffPreflight(project: SpecKitProject, feature: FeatureInboxItem, personaId: PersonaId): string[] {
  const issues: string[] = [];
  const artifact = acceptedPersonaArtifact(feature, personaId);
  if (!artifact) return ['Accept this persona artifact before creating a handoff archive.'];
  const engineIssue = engineProjectionIssue(project, feature, artifact.specKitProjection);
  if (engineIssue) issues.push(`The accepted ${personaId} artifact does not meet the selected SDD engine contract: ${engineIssue}`);
  const supportingFiles = personaHandoffSupportingFiles(project, feature, personaId);
  const files = [
    { path: artifact.path, content: artifact.markdown },
    { path: artifact.specKitProjection.path, content: artifact.specKitProjection.content },
    ...supportingFiles,
  ];
  for (const file of files) {
    if (!file.path.trim() || !file.content.trim()) issues.push('Every handoff artifact and supporting evidence file must have a path and content.');
  }
  for (const file of files) {
    const collision = files.find((candidate) => candidate !== file && candidate.path === file.path && candidate.content !== file.content);
    if (collision) issues.push(`Handoff evidence path ${file.path} contains conflicting content.`);
  }
  return [...new Set(issues)];
}

function parsePacket(value: unknown): PortablePersonaHandoff {
  const packet = value as Partial<PortablePersonaHandoff>;
  if (packet.schemaVersion !== 1 || packet.packageType !== 'studio-persona-handoff' || !packet.feature?.title || !packet.feature.summary || !packet.engine?.id || !isPersonaId(packet.artifact?.personaId) || !packet.artifact.path || !packet.artifact.markdown || !packet.artifact.specKitProjection?.path || !packet.artifact.specKitProjection.content || !['spec', 'plan', 'tasks', 'research'].includes(packet.artifact.specKitProjection.kind || '')) throw new Error('This is not a valid Studio persona handoff. Download a handoff archive from Studio and try again.');
  if (packet.supportingFiles && (!Array.isArray(packet.supportingFiles) || packet.supportingFiles.some((file) => !file || typeof file.path !== 'string' || !file.path || typeof file.content !== 'string' || !file.content))) throw new Error('This handoff has invalid supporting evidence. Download the complete Studio handoff again.');
  if (packet.continuation) {
    const continuation = packet.continuation;
    if (packet.artifact.personaId !== 'developer' || continuation.kind !== 'accepted-architecture' || !Array.isArray(continuation.creditedStages) || continuation.creditedStages.join(',') !== '2,3,4' || !continuation.specification?.path || !continuation.specification.content || !continuation.specification.acceptedAt || continuation.impactMap?.path !== 'evidence/accepted-impact-map.md' || !continuation.impactMap.content || !continuation.impactMap.acceptedAt || !continuation.architecturePlan?.path || continuation.architecturePlan.archivePath !== 'evidence/accepted-architecture-plan.md' || !continuation.architecturePlan.content || !continuation.architecturePlan.acceptedAt) throw new Error('This architecture continuation is incomplete. Import the full ZIP exported after Stage 4 approval.');
  }
  return packet as PortablePersonaHandoff;
}

/** Portable handoffs contain only reviewed delivery evidence—not repository
 * files, credentials, connector tokens, or execution receipts. */
export async function createPersonaHandoffArchive(project: SpecKitProject, feature: FeatureInboxItem, personaId: PersonaId): Promise<Blob> {
  const preflightIssues = personaHandoffPreflight(project, feature, personaId);
  if (preflightIssues.length) throw new Error(`Studio cannot create this handoff yet: ${preflightIssues.join(' ')}`);
  const artifact = acceptedPersonaArtifact(feature, personaId);
  if (!artifact) throw new Error('Accept this persona artifact before creating a handoff archive.');
  const contract = selectedEngineContract(project);
  const payload = personaId === 'product-manager' ? feature.productOutcome : personaId === 'business-analyst' ? feature.businessAnalysis : personaId === 'developer' ? feature.developerArchitecture : feature.securityResearch;
  const continuation = architectureContinuation(project, feature, personaId);
  const supportingFiles = personaHandoffSupportingFiles(project, feature, personaId);
  const packet: PortablePersonaHandoff = { schemaVersion: 1, packageType: 'studio-persona-handoff', exportedAt: new Date().toISOString(), engine: { id: contract.engineId, label: contract.label, version: contract.version }, feature: { id: feature.id, title: feature.title, summary: feature.summary, slug: feature.slug, scope: feature.scope }, artifact: { personaId, path: artifact.path, markdown: artifact.markdown, specKitProjection: artifact.specKitProjection, payload }, ...(supportingFiles.length ? { supportingFiles } : {}), ...(continuation ? { continuation } : {}) };
  const zip = new JSZip();
  zip.file(HANDOFF_FILE, JSON.stringify(packet, null, 2));
  zip.file('README.md', `# Studio persona handoff\n\nThis archive contains an accepted ${personaId} artifact and its ${contract.label} ${contract.version} projection. Import it in Studio to resume the matching delivery feature.\n`);
  zip.file(artifact.path, artifact.markdown);
  zip.file(artifact.specKitProjection.path, artifact.specKitProjection.content);
  for (const file of supportingFiles) zip.file(file.path, file.content);
  return zip.generateAsync({ type: 'blob' });
}

/** Export a PM-reviewed imported delivery without inventing a Product Brief.
 * This package is a portable review record, not an artifact-import format. */
export function reviewedDeliveryHandoffPreflight(project: SpecKitProject, feature: FeatureInboxItem): string[] {
  const issues: string[] = [];
  const decision = feature.productManagerDecision;
  const packageContents = reviewedDeliveryHandoffPackage(project, feature);
  if (decision?.status !== 'accepted') issues.push('Record the Product Manager review first.');
  if (!packageContents.userStories.length) issues.push('Attach at least one reviewed user story to this delivery item.');
  if (!packageContents.functionalRequirements.length) issues.push('Attach at least one reviewed functional requirement to this delivery item.');
  if (!packageContents.specificationPath || !packageContents.specificationContent || !feature.specification?.acceptedAt) {
    issues.push('Accept the feature’s canonical spec.md before exporting a handoff.');
  } else {
    const engineIssue = engineProjectionIssue(project, feature, { kind: 'spec', path: packageContents.specificationPath, content: packageContents.specificationContent });
    if (engineIssue) issues.push(`Canonical spec.md does not meet the selected SDD engine contract: ${engineIssue}`);
  }
  const storyIds = new Set(project.spec.userStories.map((story) => story.id));
  const requirementIds = new Set(project.spec.functionalRequirements.map((requirement) => requirement.id));
  if (feature.userStoryIds.some((id) => !storyIds.has(id))) issues.push('The delivery references a user story that is not present in this workspace.');
  if (feature.requirementIds.some((id) => !requirementIds.has(id))) issues.push('The delivery references a requirement that is not present in this workspace.');
  return issues;
}

export async function createReviewedDeliveryHandoffArchive(project: SpecKitProject, feature: FeatureInboxItem): Promise<Blob> {
  const preflightIssues = reviewedDeliveryHandoffPreflight(project, feature);
  if (preflightIssues.length) throw new Error(`Studio cannot create this handoff yet: ${preflightIssues.join(' ')}`);
  const decision = feature.productManagerDecision;
  if (!decision) throw new Error('Studio cannot create this handoff until the Product Manager review is recorded.');
  const packageContents = reviewedDeliveryHandoffPackage(project, feature);
  const contract = selectedEngineContract(project);
  const zip = new JSZip();
  zip.file(REVIEWED_DELIVERY_MANIFEST, JSON.stringify({ schemaVersion: 1, packageType: 'studio-reviewed-delivery-handoff', exportedAt: new Date().toISOString(), engine: { id: contract.engineId, label: contract.label, version: contract.version }, feature: { id: feature.id, title: feature.title, summary: feature.summary, slug: feature.slug, scope: feature.scope }, review: decision, sourceContent: packageContents.sourceContent, specification: packageContents.specificationPath && packageContents.specificationContent ? { path: packageContents.specificationPath, content: packageContents.specificationContent, acceptedAt: feature.specification?.acceptedAt || decision.recordedAt } : undefined, delivery: { userStories: packageContents.userStories, functionalRequirements: packageContents.functionalRequirements } }, null, 2));
  zip.file('README.md', `# Studio reviewed delivery handoff\n\nThis archive records the Product Manager review of an already-structured imported delivery. It includes the reviewed source when available, user stories, functional requirements, the recorded decision, and the accepted canonical Spec Kit specification when present. It does not contain repository files or authorize implementation.\n`);
  zip.file(packageContents.path, packageContents.markdown);
  zip.file(packageContents.storiesPath, packageContents.storiesMarkdown);
  zip.file(packageContents.requirementsPath, packageContents.requirementsMarkdown);
  if (packageContents.specificationPath && packageContents.specificationContent) zip.file(packageContents.specificationPath, packageContents.specificationContent);
  if (packageContents.sourcePath && packageContents.sourceContent) zip.file(packageContents.sourcePath, packageContents.sourceContent);
  return zip.generateAsync({ type: 'blob' });
}

/** Reads the bounded Studio archive (or its JSON manifest file) without
 * interpreting arbitrary Markdown as authoritative workflow state. */
function parseReviewedDeliveryPacket(value: unknown, zip?: JSZip): PortableReviewedDeliveryHandoff {
  const packet = value as Partial<PortableReviewedDeliveryHandoff>;
  if (packet.schemaVersion !== 1 || packet.packageType !== 'studio-reviewed-delivery-handoff' || !packet.feature?.title || !packet.feature.summary || !packet.engine?.id || packet.review?.personaId !== 'product-manager' || packet.review.status !== 'accepted') throw new Error('This is not a valid Studio reviewed-delivery handoff.');
  const legacySource = zip?.file(REVIEWED_DELIVERY_SOURCE_PATH);
  const legacySpecification = packet.feature.slug ? zip?.file(`specs/${packet.feature.slug}/spec.md`) : undefined;
  return {
    ...(packet as PortableReviewedDeliveryHandoff),
    ...(packet.sourceContent ? {} : legacySource ? { sourceContent: undefined } : {}),
    ...(packet.specification ? {} : legacySpecification ? { specification: undefined } : {}),
  };
}

export async function readStudioHandoff(file: File): Promise<StudioPortableHandoff> {
  if (file.size > MAX_HANDOFF_BYTES) throw new Error('This handoff is larger than 1 MB. Studio accepts only bounded persona handoff archives.');
  let raw: string;
  let zip: JSZip | undefined;
  if (/\.zip$/i.test(file.name)) {
    zip = await JSZip.loadAsync(file);
    const entry = zip.file(studioHandoffImportRule('studio-persona-handoff').manifestPath) || zip.file(studioHandoffImportRule('studio-reviewed-delivery-handoff').manifestPath);
    if (!entry) throw new Error('This ZIP does not contain a supported Studio handoff manifest.');
    raw = await entry.async('string');
  } else {
    raw = await file.text();
  }
  if (raw.length > MAX_HANDOFF_BYTES) throw new Error('This handoff manifest is too large.');
  try {
    const parsed = JSON.parse(raw) as { packageType?: string };
    if (parsed.packageType === 'studio-reviewed-delivery-handoff') {
      const packet = parseReviewedDeliveryPacket(parsed, zip);
      const sourceEntry = zip?.file(REVIEWED_DELIVERY_SOURCE_PATH);
      const specificationEntry = packet.feature.slug ? zip?.file(`specs/${packet.feature.slug}/spec.md`) : undefined;
      if (!packet.sourceContent && sourceEntry) packet.sourceContent = await sourceEntry.async('string');
      if (!packet.specification && specificationEntry) packet.specification = { path: `specs/${packet.feature.slug}/spec.md`, content: await specificationEntry.async('string'), acceptedAt: packet.review.recordedAt };
      return packet;
    }
    const packet = parsePacket(parsed);
    if (zip) {
      const evidence = [
        { path: packet.artifact.path, content: packet.artifact.markdown },
        { path: packet.artifact.specKitProjection.path, content: packet.artifact.specKitProjection.content },
        ...(packet.supportingFiles || []),
      ];
      for (const item of evidence) {
        const issue = await archiveEntryIssue(zip, item.path, item.content);
        if (issue) throw new Error(issue);
      }
    }
    if (packet.continuation) {
      if (!zip) throw new Error('Stage 5 continuation requires the complete architecture handoff ZIP.');
      for (const evidence of [{ archivePath: packet.continuation.specification.path, content: packet.continuation.specification.content }, { archivePath: packet.continuation.impactMap.path, content: packet.continuation.impactMap.content }, { archivePath: packet.continuation.architecturePlan.archivePath, content: packet.continuation.architecturePlan.content }]) {
        const issue = await archiveEntryIssue(zip, evidence.archivePath, evidence.content);
        if (issue) throw new Error(issue);
      }
    }
    return packet;
  } catch (error) { throw error instanceof Error ? error : new Error('Studio could not read this handoff.'); }
}

/** Backwards-compatible reader for code that explicitly accepts only a
 * standard persona artifact archive. UI import uses readStudioHandoff. */
export async function readPersonaHandoff(file: File): Promise<PortablePersonaHandoff> {
  const handoff = await readStudioHandoff(file);
  if (handoff.packageType !== 'studio-persona-handoff') throw new Error('This is a PM reviewed-delivery handoff. Import it through a Studio persona workspace.');
  return handoff;
}

/** Narrow the untrusted archive payload before the workspace decides whether
 * it is compatible with the selected engine and may be persisted. */
export function handoffArtifactPayload(packet: PortablePersonaHandoff): PortablePersonaArtifact {
  const payload = packet.artifact.payload as Partial<PortablePersonaArtifact>;
  if (!payload || typeof payload !== 'object' || payload.title !== packet.feature.title || payload.path !== packet.artifact.path || payload.markdown !== packet.artifact.markdown || !payload.acceptedAt || !payload.specKitProjection || payload.specKitProjection.path !== packet.artifact.specKitProjection.path || payload.specKitProjection.content !== packet.artifact.specKitProjection.content) throw new Error('The handoff artifact does not match its manifest. Nothing was imported.');
  return payload as PortablePersonaArtifact;
}
