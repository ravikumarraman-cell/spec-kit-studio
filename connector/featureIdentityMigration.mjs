import { promises as fs } from 'node:fs';
import path from 'node:path';

const CANONICAL_SLUG = /^\d{3,}-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LEGACY_STUDIO_SLUG = /^feat-\d{4}-\d+-[a-z0-9]+(?:-[a-z0-9]+)*$/;

function featureDirectory(root, slug) {
  return path.resolve(root, 'specs', slug);
}

/**
 * Move only one legacy Studio feature directory into its canonical Spec-Kit
 * location. It never merges or overwrites a directory, follows no symlinks,
 * and treats an already-migrated target as a successful no-op.
 */
export async function migrateFeatureIdentityDirectory(root, fromSlug, toSlug, fileSystem = fs) {
  if (!LEGACY_STUDIO_SLUG.test(String(fromSlug || ''))) throw new Error('Studio can migrate only a legacy feat-YYYY-N-name feature directory.');
  if (!CANONICAL_SLUG.test(String(toSlug || ''))) throw new Error('The destination must use the official numbered Spec-Kit format, for example 001-export-inventory.');
  if (fromSlug === toSlug) throw new Error('The source and destination feature identities must differ.');

  const specsRoot = path.resolve(root, 'specs');
  const source = featureDirectory(root, fromSlug);
  const destination = featureDirectory(root, toSlug);
  if (path.dirname(source) !== specsRoot || path.dirname(destination) !== specsRoot) throw new Error('Feature identity migration is limited to direct directories under specs/.');

  const sourceStat = await fileSystem.lstat(source).catch((error) => error?.code === 'ENOENT' ? null : Promise.reject(error));
  const destinationStat = await fileSystem.lstat(destination).catch((error) => error?.code === 'ENOENT' ? null : Promise.reject(error));
  if (destinationStat) {
    if (destinationStat.isSymbolicLink() || !destinationStat.isDirectory()) throw new Error('The official destination exists but is not a safe feature directory.');
    if (sourceStat) throw new Error(`Cannot migrate because specs/${toSlug} already exists. Studio will not merge or overwrite feature artifacts.`);
    return { moved: false, fromPath: `specs/${fromSlug}`, toPath: `specs/${toSlug}` };
  }
  if (!sourceStat) return { moved: false, fromPath: `specs/${fromSlug}`, toPath: `specs/${toSlug}` };
  if (sourceStat.isSymbolicLink() || !sourceStat.isDirectory()) throw new Error('The legacy feature path is not a safe directory to migrate.');

  await fileSystem.rename(source, destination);
  return { moved: true, fromPath: `specs/${fromSlug}`, toPath: `specs/${toSlug}` };
}
