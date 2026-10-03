import assert from 'node:assert/strict';
import test from 'node:test';
import { sddAdapterDistributionManifest } from '../connector/sddAdapterDistribution.mjs';

test('adapter distribution metadata exposes compatibility, never an executable source', () => {
  const manifest = sddAdapterDistributionManifest('0.1.20');
  assert.deepEqual(manifest.builtInAdapters, ['github-spec-kit']);
  assert.equal(manifest.adapterApiVersion, 1);
  assert.deepEqual(manifest.externalManifestProtocol.allowedCapabilities, ['artifact-read']);
  assert.equal(manifest.externalManifestProtocol.lifecycleCapabilitiesRequireBundledAdapter, true);
  assert.equal(JSON.stringify(manifest).match(/command|url|download/i), null);
});
