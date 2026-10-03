import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const EXTERNAL_ENGINE_IDS = new Set(['openspec', 'bmad-method', 'tessl', 'kiro']);
const ARTIFACT_ROLES = new Set(['spec', 'plan', 'tasks']);
const MAX_ARTIFACT_BYTES = 1_000_000;

function isSafeRelativePath(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= 240 && !value.startsWith('/') && !value.includes('\\') && value.split('/').every((part) => part && part !== '.' && part !== '..');
}

function normalizedManifest(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Each trusted SDD adapter manifest must be an object.');
  const { apiVersion, id, label, artifactFiles } = value;
  if (apiVersion !== 1 || !EXTERNAL_ENGINE_IDS.has(id)) throw new Error('A trusted external SDD adapter must use a supported future engine id and API version 1.');
  if (typeof label !== 'string' || !label.trim() || label.length > 80) throw new Error(`Trusted SDD adapter ${id} needs a short label.`);
  if (!artifactFiles || typeof artifactFiles !== 'object' || Array.isArray(artifactFiles)) throw new Error(`Trusted SDD adapter ${id} needs declared artifact files.`);
  const entries = Object.entries(artifactFiles).filter(([role]) => ARTIFACT_ROLES.has(role)).map(([role, files]) => {
    if (!Array.isArray(files) || files.length === 0 || files.length > 10 || !files.every(isSafeRelativePath)) throw new Error(`Trusted SDD adapter ${id} has unsafe ${role} artifact paths.`);
    return [role, [...new Set(files)].sort()];
  }).sort(([left], [right]) => left.localeCompare(right));
  if (!entries.length) throw new Error(`Trusted SDD adapter ${id} needs at least one artifact role.`);
  return { apiVersion: 1, id, label: label.trim(), artifactFiles: Object.fromEntries(entries) };
}

export function trustedAdapterManifestDigest(manifest) {
  return createHash('sha256').update(JSON.stringify(normalizedManifest(manifest))).digest('hex');
}

function trustedDigestMap(value) {
  if (typeof value !== 'string' || !value.trim()) return new Map();
  const entries = value.split(',').map((entry) => entry.trim()).filter(Boolean).map((entry) => entry.split(':'));
  if (!entries.every(([id, digest]) => EXTERNAL_ENGINE_IDS.has(id) && /^[a-f0-9]{64}$/i.test(digest || ''))) throw new Error('STUDIO_TRUSTED_SDD_ADAPTER_DIGESTS must contain comma-separated engine-id:sha256 pairs.');
  return new Map(entries.map(([id, digest]) => [id, digest.toLowerCase()]));
}

async function readDeclaredArtifacts(root, manifest) {
  const rootReal = await fs.realpath(root);
  const artifacts = [];
  for (const [kind, files] of Object.entries(manifest.artifactFiles)) for (const relativePath of files) {
    const candidate = path.resolve(rootReal, ...relativePath.split('/'));
    if (candidate !== rootReal && !candidate.startsWith(`${rootReal}${path.sep}`)) throw new Error('Trusted adapter artifact path escaped the selected repository.');
    let resolved; let stat;
    try { resolved = await fs.realpath(candidate); stat = await fs.stat(resolved); } catch { continue; }
    if (!resolved.startsWith(`${rootReal}${path.sep}`) || !stat.isFile() || stat.size > MAX_ARTIFACT_BYTES) continue;
    artifacts.push({ path: relativePath, kind, content: await fs.readFile(resolved, 'utf8'), modifiedAt: stat.mtime.toISOString() });
  }
  return { artifacts };
}

/** Hash-pinned future-engine manifests are artifact-read-only. They cannot
 * introduce JavaScript, executables, arguments, installers, or lifecycle work. */
export function loadTrustedExternalSddAdapters(manifestsJson = process.env.STUDIO_TRUSTED_SDD_ADAPTER_MANIFESTS_JSON, digests = process.env.STUDIO_TRUSTED_SDD_ADAPTER_DIGESTS) {
  if (!manifestsJson) return [];
  let candidates;
  try { candidates = JSON.parse(manifestsJson); } catch { throw new Error('STUDIO_TRUSTED_SDD_ADAPTER_MANIFESTS_JSON must be valid JSON.'); }
  if (!Array.isArray(candidates) || candidates.length > EXTERNAL_ENGINE_IDS.size) throw new Error('Trusted SDD adapter manifests must be a short array.');
  const trustedDigests = trustedDigestMap(digests); const seen = new Set();
  return candidates.map((candidate) => {
    const manifest = normalizedManifest(candidate); const digest = trustedAdapterManifestDigest(manifest);
    if (seen.has(manifest.id) || trustedDigests.get(manifest.id) !== digest) throw new Error(`Trusted SDD adapter ${manifest.id} is not pinned to its declared SHA-256 digest.`);
    seen.add(manifest.id);
    return { id: manifest.id, apiVersion: manifest.apiVersion, label: manifest.label, availability: 'trusted-preview', capabilities: ['artifact-read'], artifactRoles: Object.keys(manifest.artifactFiles), trust: { source: 'pinned-local-manifest', digest }, async readArtifacts(root) { return readDeclaredArtifacts(root, manifest); } };
  });
}
