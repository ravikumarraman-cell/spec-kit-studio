#!/usr/bin/env node
/**
 * Creates the small, separately installable local-connector distribution.
 * It deliberately stages only connector runtime files and dotenv, never the
 * Studio browser application, server API, repository data, or .env files.
 */
import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import spawn from 'cross-spawn';
import { sddAdapterDistributionManifest } from '../connector/sddAdapterDistribution.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const version = process.env.npm_package_version || '0.1.0';
const staging = path.join(root, 'dist', 'local-connector-package');
const downloadDirectory = path.join(root, 'public', 'downloads');
const packageName = '@spec-kit-studio/local-connector';
const archiveName = `spec-kit-studio-local-connector-${version}.tgz`;

const packageJson = {
  name: packageName,
  version,
  description: 'Loopback-only local repository and agent connector for Spec-Kit Studio.',
  type: 'module',
  private: false,
  license: 'UNLICENSED',
  engines: { node: '>=22.6.0' },
  bin: { 'spec-kit-studio-connector': './connector.mjs' },
  files: ['connector.mjs', 'productionConfig.mjs', 'specKitConformance.mjs', 'githubMilestone.mjs', 'featureIdentityMigration.mjs', 'agentPrompt.mjs', 'httpProtocol.mjs', 'ttlCache.mjs', 'specKitArtifacts.mjs', 'sddEngineAdapters.mjs', 'trustedExternalSddAdapters.mjs', 'sddAdapterDistribution.mjs', 'README.md'],
  dependencies: { 'cross-spawn': '^7.0.6', dotenv: '^17.2.3' },
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

On Windows PowerShell, set the same values with \`$env:STUDIO_CONNECTOR_MODE = "production"\` (and the corresponding variables above), then run \`spec-kit-studio-connector\`.

Read the full guide at \`docs/local-connector.md\` in the Studio source distribution. Do not expose the connector on a LAN, put its token in a hosted environment, or allow a broad folder such as your home directory.
`;

await rm(staging, { recursive: true, force: true });
await mkdir(staging, { recursive: true });
await Promise.all([
  cp(path.join(root, 'connector', 'server.mjs'), path.join(staging, 'connector.mjs')),
  cp(path.join(root, 'connector', 'productionConfig.mjs'), path.join(staging, 'productionConfig.mjs')),
  cp(path.join(root, 'connector', 'specKitConformance.mjs'), path.join(staging, 'specKitConformance.mjs')),
  cp(path.join(root, 'connector', 'githubMilestone.mjs'), path.join(staging, 'githubMilestone.mjs')),
  cp(path.join(root, 'connector', 'featureIdentityMigration.mjs'), path.join(staging, 'featureIdentityMigration.mjs')),
  cp(path.join(root, 'connector', 'agentPrompt.mjs'), path.join(staging, 'agentPrompt.mjs')),
  cp(path.join(root, 'connector', 'httpProtocol.mjs'), path.join(staging, 'httpProtocol.mjs')),
  cp(path.join(root, 'connector', 'ttlCache.mjs'), path.join(staging, 'ttlCache.mjs')),
  cp(path.join(root, 'connector', 'specKitArtifacts.mjs'), path.join(staging, 'specKitArtifacts.mjs')),
  cp(path.join(root, 'connector', 'sddEngineAdapters.mjs'), path.join(staging, 'sddEngineAdapters.mjs')),
  cp(path.join(root, 'connector', 'trustedExternalSddAdapters.mjs'), path.join(staging, 'trustedExternalSddAdapters.mjs')),
  cp(path.join(root, 'connector', 'sddAdapterDistribution.mjs'), path.join(staging, 'sddAdapterDistribution.mjs')),
  writeFile(path.join(staging, 'package.json'), `${JSON.stringify(packageJson, null, 2)}\n`),
  writeFile(path.join(staging, 'README.md'), readme),
]);
await mkdir(downloadDirectory, { recursive: true });
await mkdir(path.join(root, 'public', 'docs'), { recursive: true });
await rm(path.join(root, 'public', 'docs', 'install-local-connector.md'), { force: true });
await cp(path.join(root, 'docs', 'local-connector.md'), path.join(root, 'public', 'docs', 'local-connector.md'));
// Do not depend on a contributor's global npm cache. Some managed machines
// retain root-owned cache entries from an older npm installation.
const packed = spawn.sync('npm', ['pack', '--pack-destination', downloadDirectory], {
  cwd: staging,
  encoding: 'utf8',
  env: { ...process.env, npm_config_cache: path.join(root, 'dist', '.npm-cache') },
});
if (packed.status !== 0) {
  process.stderr.write(packed.stderr || packed.stdout || 'Unable to package the local connector.\n');
  process.exit(packed.status || 1);
}
await writeFile(path.join(downloadDirectory, 'local-connector.json'), `${JSON.stringify({ packageName, version, apiVersion: 4, downloadPath: `/downloads/${archiveName}` }, null, 2)}\n`);
await writeFile(path.join(downloadDirectory, 'sdd-adapter-distribution.json'), `${JSON.stringify(sddAdapterDistributionManifest(version), null, 2)}\n`);
process.stdout.write(`Created ${path.join(downloadDirectory, archiveName)}\n`);
