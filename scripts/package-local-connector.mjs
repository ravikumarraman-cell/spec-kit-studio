#!/usr/bin/env node
/**
 * Creates the small, separately installable local-connector distribution.
 * It deliberately stages only connector runtime files and dotenv, never the
 * Studio browser application, server API, repository data, or .env files.
 */
import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const version = process.env.npm_package_version || '0.1.0';
const staging = path.join(root, 'dist', 'local-connector-package');
const downloadDirectory = path.join(root, 'public', 'downloads');
const packageName = '@spec-kit-studio/local-connector';

const packageJson = {
  name: packageName,
  version,
  description: 'Loopback-only local repository and agent connector for Spec-Kit Studio.',
  type: 'module',
  private: false,
  license: 'UNLICENSED',
  engines: { node: '>=22.12.0 <23' },
  bin: { 'spec-kit-studio-connector': './connector.mjs' },
  files: ['connector.mjs', 'productionConfig.mjs', 'specKitConformance.mjs', 'README.md'],
  dependencies: { dotenv: '^17.2.3' },
};

const readme = `# Spec-Kit Studio local connector

This package is the local companion for a hosted Spec-Kit Studio UI. It listens only on \`127.0.0.1\`; it does not upload repositories or provider credentials.

## Start securely

\`\`\`bash
export STUDIO_CONNECTOR_MODE=production
export STUDIO_ALLOWED_ROOTS="/absolute/path/to/your/studio-repositories"
export STUDIO_ALLOWED_ORIGINS="https://your-studio.example.com"
export STUDIO_CONNECTOR_TOKEN="a-long-random-value-of-at-least-32-bytes"
spec-kit-studio-connector
\`\`\`

Open \`http://127.0.0.1:4318/health\` on the same computer. Then enter that URL and the pairing token in **Connected Workspace** in Studio.

Read the full guide at \`docs/install-local-connector.md\` in the Studio source distribution. Do not expose the connector on a LAN, put its token in a hosted environment, or allow a broad folder such as your home directory.
`;

await rm(staging, { recursive: true, force: true });
await mkdir(staging, { recursive: true });
await Promise.all([
  cp(path.join(root, 'connector', 'server.mjs'), path.join(staging, 'connector.mjs')),
  cp(path.join(root, 'connector', 'productionConfig.mjs'), path.join(staging, 'productionConfig.mjs')),
  cp(path.join(root, 'connector', 'specKitConformance.mjs'), path.join(staging, 'specKitConformance.mjs')),
  writeFile(path.join(staging, 'package.json'), `${JSON.stringify(packageJson, null, 2)}\n`),
  writeFile(path.join(staging, 'README.md'), readme),
]);
await mkdir(downloadDirectory, { recursive: true });
await mkdir(path.join(root, 'public', 'docs'), { recursive: true });
await cp(path.join(root, 'docs', 'install-local-connector.md'), path.join(root, 'public', 'docs', 'install-local-connector.md'));
// Do not depend on a contributor's global npm cache. Some managed machines
// retain root-owned cache entries from an older npm installation.
const packed = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['pack', '--pack-destination', downloadDirectory], {
  cwd: staging,
  encoding: 'utf8',
  env: { ...process.env, npm_config_cache: path.join(root, 'dist', '.npm-cache') },
});
if (packed.status !== 0) {
  process.stderr.write(packed.stderr || packed.stdout || 'Unable to package the local connector.\n');
  process.exit(packed.status || 1);
}
process.stdout.write(`Created ${path.join(downloadDirectory, `spec-kit-studio-local-connector-${version}.tgz`)}\n`);
