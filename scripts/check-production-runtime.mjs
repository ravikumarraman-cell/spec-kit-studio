import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const packageJson = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const [major, minor, patch] = process.versions.node.split('.').map(Number);
const minimum = [22, 6, 0];
const supported = [major, minor, patch].some((part, index, version) => part > minimum[index] && version.slice(0, index).every((value, prefixIndex) => value === minimum[prefixIndex]))
  || [major, minor, patch].every((part, index) => part === minimum[index]);

if (!supported) {
  throw new Error(`Production verification requires Node 22.6.0 or newer; found ${process.version}. Package engines: ${packageJson.engines?.node || 'unspecified'}.`);
}

if (!packageJson.packageManager && !await readFile(resolve(root, 'package-lock.json'), 'utf8').then(Boolean).catch(() => false)) {
  throw new Error('Production verification requires a committed npm lockfile for reproducible npm ci installs.');
}

process.stdout.write(`Production runtime check passed: Node ${process.version}; reproducible npm install metadata is present.\n`);
