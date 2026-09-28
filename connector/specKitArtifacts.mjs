import { promises as fs } from 'node:fs';
import path from 'node:path';

const FEATURE_ARTIFACTS = ['spec.md', 'plan.md', 'tasks.md'];
const BUG_ARTIFACTS = ['assessment.md', 'fix.md', 'test.md'];
const ASSESSMENT_ARTIFACTS = ['intake.md', 'research.md', 'problem.md', 'concept.md', 'decision.md'];

async function childDirectories(root, relativePath) {
  const entries = await fs.readdir(path.join(root, relativePath), { withFileTypes: true }).catch(() => []);
  return entries.filter((entry) => entry.isDirectory()).map((entry) => path.join(relativePath, entry.name));
}

async function namedFiles(root, directories, names) {
  const files = [];
  for (const directory of directories) {
    for (const name of names) {
      const relativePath = path.join(directory, name);
      const stat = await fs.stat(path.join(root, relativePath)).catch(() => null);
      if (stat?.isFile()) files.push(relativePath);
    }
  }
  return files;
}

/**
 * Reads official artifacts without scanning the application tree. Large
 * repositories commonly exceed generic scan budgets before traversal reaches
 * `specs/`, which must never make a completed feature appear missing.
 */
export async function readSpecKitArtifacts(root) {
  const [featureDirectories, bugDirectories, assessmentDirectories] = await Promise.all([
    childDirectories(root, 'specs'),
    childDirectories(root, path.join('.specify', 'bugs')),
    childDirectories(root, path.join('.specify', 'assessments')),
  ]);
  const files = await Promise.all([
    namedFiles(root, featureDirectories, FEATURE_ARTIFACTS),
    namedFiles(root, bugDirectories, BUG_ARTIFACTS),
    namedFiles(root, assessmentDirectories, ASSESSMENT_ARTIFACTS),
  ]).then((groups) => groups.flat());
  const artifacts = await Promise.all(files.map(async (file) => {
    const target = path.join(root, file);
    const [content, stat] = await Promise.all([fs.readFile(target, 'utf8'), fs.stat(target)]);
    return { path: file, kind: path.basename(file, '.md').toLowerCase(), content: content.slice(0, 400_000), modifiedAt: stat.mtime.toISOString() };
  }));
  artifacts.sort((left, right) => right.modifiedAt.localeCompare(left.modifiedAt));
  return { artifacts };
}
