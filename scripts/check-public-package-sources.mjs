import { existsSync, readFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const packageLock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
const npmConfig = readFileSync(new URL('../.npmrc', import.meta.url), 'utf8');
const errors = [];
const dependencySections = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];
const forbiddenSpec = /^(?:git\+|git@|github:|ssh:|file:|link:|workspace:)/i;
const configuredRegistry = npmConfig.match(/^registry=(.+)$/m)?.[1]?.trim().replace(/\/+$/, '');
const publicRegistry = 'https://registry.npmjs.org';
const credentialSetting = /^\s*(?:_auth(?:Token)?|\/\/[^\s]+:\s*_(?:auth|authToken)|always-auth)\s*=/mi;

// Vercel may replace the project .npmrc while applying its install-script
// policy. The committed lockfiles remain the deployable source of truth there:
// every resolved tarball below must still come directly from npmjs.
if (!process.env.VERCEL && configuredRegistry !== publicRegistry) {
  errors.push(`The project .npmrc must configure the public npm registry (${publicRegistry}/).`);
}

if (!process.env.VERCEL && credentialSetting.test(npmConfig)) {
  errors.push('The project .npmrc must not contain registry authentication settings. Configure credentials only in deployment environment settings when they are explicitly required.');
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
  if (!resolved.startsWith(`${publicRegistry}/`)) {
    errors.push(`${packagePath || 'root'} does not resolve through the public npm registry.`);
  }
}

if (existsSync(new URL('../bun.lock', import.meta.url))) {
  const bunLock = readFileSync(new URL('../bun.lock', import.meta.url), 'utf8');
  const resolvedUrls = bunLock.match(/https?:\/\/[^"\s,]+/g) || [];
  for (const resolved of resolvedUrls) {
    if (!resolved.startsWith(`${publicRegistry}/`)) {
      errors.push(`bun.lock does not resolve through the public npm registry: ${resolved}`);
    }
  }
}

if (errors.length) {
  process.stderr.write(`Public dependency source check failed:\n${errors.map((error) => `- ${error}`).join('\n')}\n`);
  process.exit(1);
}

process.stdout.write(`Configured dependency source check passed: ${configuredRegistry}.\n`);
