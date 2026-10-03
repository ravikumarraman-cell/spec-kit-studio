import { readSpecKitArtifacts } from './specKitArtifacts.mjs';
import { loadTrustedExternalSddAdapters } from './trustedExternalSddAdapters.mjs';

export const SDD_ENGINE_ADAPTER_API_VERSION = 1;

const githubSpecKit = {
  id: 'github-spec-kit', apiVersion: SDD_ENGINE_ADAPTER_API_VERSION,
  label: 'GitHub Spec Kit', availability: 'available',
  capabilities: ['detect', 'artifact-read', 'strict-conformance', 'status', 'install', 'initialize', 'agent-stage-run'],
  artifactRoles: ['spec', 'plan', 'tasks'],
  async readArtifacts(root) { return readSpecKitArtifacts(root); },
};
const adapters = new Map([[githubSpecKit.id, githubSpecKit]]);
// Built-in adapters can own a verified CLI lifecycle. Externally declared
// adapters stay hash-pinned, artifact-read-only previews until Studio ships a
// dedicated lifecycle implementation for them.
for (const adapter of loadTrustedExternalSddAdapters()) adapters.set(adapter.id, adapter);

export function availableSddEngineAdapters() {
  return [...adapters.values()].map(({ readArtifacts, ...metadata }) => metadata);
}
export function sddEngineAdapter(id) { return adapters.get(id); }
