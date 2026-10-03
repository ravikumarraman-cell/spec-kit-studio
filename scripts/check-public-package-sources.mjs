import { readFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const packageLock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
const npmConfig = readFileSync(new URL('../.npmrc', import.meta.url), 'utf8');
const errors = [];
const dependencySections = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];
const forbiddenSpec = /^(?:git\+|git@|github:|ssh:|file:|link:|workspace:)/i;
const configuredRegistry = npmConfig.match(/^registry=(.+)$/m)?.[1]?.trim().replace(/\/+$/, '');

if (!configuredRegistry?.startsWith('https://')) {
  errors.push('The project .npmrc must configure an HTTPS dependency registry.');
}

for (const section of dependencySections) {
  for (const [name, spec] of Object.entries(packageJson[section] || {})) {
    if (typeof spec === 'string' && forbiddenSpec.test(spec)) {
      errors.push(`${section}.${name} uses unsupported non-registry source "${spec}".`);
    }
  }
}

for (const [packagePath, metadata] of Object.entries(packageLock.packages || {})) {
  if (!metadata || typeof metadata !== 'object') continue;
  const resolved = metadata.resolved;
  if (typeof resolved !== 'string') continue;
  if (configuredRegistry && !resolved.startsWith(`${configuredRegistry}/`)) {
    errors.push(`${packagePath || 'root'} does not resolve through the registry configured in .npmrc.`);
  }
}

if (errors.length) {
  process.stderr.write(`Public dependency source check failed:\n${errors.map((error) => `- ${error}`).join('\n')}\n`);
  process.exit(1);
}

process.stdout.write(`Configured dependency source check passed: ${configuredRegistry}.\n`);
