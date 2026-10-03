import type { FeatureInboxItem, SpecKitProject } from '../types/speckit';
import { SPECKIT_RELEASE_TAG, validateSpecKitArtifacts, type SpecKitConformanceArtifact, type SpecKitCoreArtifactKind } from './specKitCompliance';
import { sddEngine } from './sddEngines';

export interface EngineContractDescriptor {
  engineId: string;
  label: string;
  version: string;
  available: boolean;
}

/** Single source of truth for the engine/version shown on every deliverable. */
export function selectedEngineContract(project: SpecKitProject): EngineContractDescriptor {
  const engine = sddEngine(project.sddEngine || 'github-spec-kit');
  return engine.id === 'github-spec-kit'
    ? { engineId: engine.id, label: engine.label, version: SPECKIT_RELEASE_TAG, available: true }
    : { engineId: engine.id, label: engine.label, version: 'adapter pending', available: false };
}

/** Normalize Journey validation behind the chosen engine. GitHub Spec Kit is
 * deliberately delegated unchanged so its existing strict contract remains
 * authoritative while additional adapters are introduced. */
export function validateSddEngineArtifacts(project: SpecKitProject, feature: FeatureInboxItem, artifacts: SpecKitConformanceArtifact[], requiredKinds: SpecKitCoreArtifactKind[]) {
  if ((project.sddEngine || 'github-spec-kit') === 'github-spec-kit') return validateSpecKitArtifacts(feature, artifacts, requiredKinds);
  return [{ code: 'engine-adapter-unavailable', message: `The selected SDD engine does not have a verified connector adapter yet.` }];
}
