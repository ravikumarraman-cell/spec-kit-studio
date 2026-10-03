import assert from 'node:assert/strict';
import test from 'node:test';
import { loadTrustedExternalSddAdapters, trustedAdapterManifestDigest } from '../connector/trustedExternalSddAdapters.mjs';

const openSpecManifest = {
  apiVersion: 1,
  id: 'openspec',
  label: 'OpenSpec (pinned preview)',
  artifactFiles: { spec: ['openspec/spec.md'], plan: ['openspec/plan.md'] },
};

test('a future SDD adapter requires a matching machine-owner digest and remains artifact-read-only', () => {
  const digest = trustedAdapterManifestDigest(openSpecManifest);
  const [adapter] = loadTrustedExternalSddAdapters(JSON.stringify([openSpecManifest]), `openspec:${digest}`);
  assert.deepEqual(adapter.capabilities, ['artifact-read']);
  assert.equal(adapter.availability, 'trusted-preview');
  assert.equal(adapter.trust.digest, digest);
  assert.equal(typeof adapter.readArtifacts, 'function');
});

test('external SDD adapter manifests reject altered, unpinned, and unsafe declarations', () => {
  const digest = trustedAdapterManifestDigest(openSpecManifest);
  assert.throws(() => loadTrustedExternalSddAdapters(JSON.stringify([{ ...openSpecManifest, label: 'Changed after approval' }]), `openspec:${digest}`), /not pinned/);
  assert.throws(() => loadTrustedExternalSddAdapters(JSON.stringify([{ ...openSpecManifest, artifactFiles: { spec: ['../outside.md'] } }]), `openspec:${digest}`), /unsafe/);
  assert.throws(() => loadTrustedExternalSddAdapters(JSON.stringify([{ ...openSpecManifest, id: 'github-spec-kit' }]), `openspec:${digest}`), /supported future engine/);
});
