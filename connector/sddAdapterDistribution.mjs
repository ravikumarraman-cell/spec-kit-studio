import { SDD_ENGINE_ADAPTER_API_VERSION } from './sddEngineAdapters.mjs';

/** Stable release metadata for administrators and future extension tooling.
 * It deliberately describes compatibility only; adapter code is never fetched
 * or executed from this document. */
export function sddAdapterDistributionManifest(connectorVersion) {
  return {
    schemaVersion: 1,
    connectorVersion,
    adapterApiVersion: SDD_ENGINE_ADAPTER_API_VERSION,
    builtInAdapters: ['github-spec-kit'],
    externalManifestProtocol: {
      apiVersion: 1,
      environmentVariable: 'STUDIO_TRUSTED_SDD_ADAPTER_MANIFESTS_JSON',
      digestVariable: 'STUDIO_TRUSTED_SDD_ADAPTER_DIGESTS',
      allowedCapabilities: ['artifact-read'],
      lifecycleCapabilitiesRequireBundledAdapter: true,
    },
  };
}
