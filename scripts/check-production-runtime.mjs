import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const packageJson = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const [major, minor] = process.versions.node.split('.').map(Number);

if (major !== 22 || minor < 12) {
  throw new Error(`Production verification requires Node 22.12.x through 22.x; found ${process.version}. Package engines: ${packageJson.engines?.node || 'unspecified'}.`);
}

if (!packageJson.packageManager && !await readFile(resolve(root, 'package-lock.json'), 'utf8').then(Boolean).catch(() => false)) {
  throw new Error('Production verification requires a committed npm lockfile for reproducible npm ci installs.');
}

process.stdout.write(`Production runtime check passed: Node ${process.version}; reproducible npm install metadata is present.\n`);
