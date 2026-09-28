import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('artifact-producing planning stages are isolated and can promote only their changed official artifact', async () => {
  const source = await readFile(new URL('../connector/server.mjs', import.meta.url), 'utf8');
  assert.match(source, /git', \['worktree', 'add', '--detach', sandbox, 'HEAD'\]/);
  assert.match(source, /const REQUIRED_SPEC_KIT_ARTIFACTS = new Set\(\['spec', 'plan', 'tasks'\]\)/);
  assert.match(source, /const baselineArtifacts = await officialFeatureArtifactFingerprints\(sandbox, requiredArtifact\)/);
  assert.match(source, /seedIsolatedSpecKitContext\(root, sandbox\)/);
  assert.match(source, /for \(const relativePath of \['\.specify', 'specs'\]\)/);
  assert.match(source, /const entries = await fs\.readdir\(source\)/);
  assert.match(source, /path\.join\(destination, entry\)/);
  assert.match(source, /baselineArtifacts\.get\(item\.path\) !== artifactFingerprint\(item\)/);
  assert.match(source, /currentRootArtifacts\.get\(artifact\.path\) !== baselineArtifacts\.get\(artifact\.path\)/);
  assert.match(source, /validateRequiredArtifactConformance\(requiredArtifact, artifact\.content\)/);
  assert.match(source, /Studio did not promote it; all sandbox changes were discarded/);
  assert.match(source, /git', \['worktree', 'remove', '--force', sandbox\]/);
  assert.match(source, /promotedFiles: \[artifact\.path\], discardedSandboxChanges: true/);
  assert.match(source, /Keep the job running while a successful child is being validated and/);
  assert.match(source, /if \(job\.status === 'running'\) \{ job\.ok = processSucceeded; job\.status = processSucceeded \? 'succeeded' : 'failed'; \}/);
  assert.match(source, /function stopConnector\(signal\)/);
  assert.match(source, /stopping active local-agent jobs/);
  assert.match(source, /process\.once\('SIGINT', \(\) => stopConnector\('SIGINT'\)\)/);
  assert.match(source, /Agent writes are blocked in the primary source checkout/);
  assert.match(source, /writeScope === 'workspace-write' && !await isLinkedGitWorktree\(root\)/);
});

test('Stage 4 and Stage 5 request isolated plan and task artifacts instead of writing the primary checkout', async () => {
  const source = await readFile(new URL('../src/components/journey/FeatureJourney.tsx', import.meta.url), 'utf8');
  assert.match(source, /stageId === 2 \? 'spec' : stageId === 4 \? 'plan' : stageId === 5 \? 'tasks' : undefined/);
  assert.match(source, /writeScope, requiredArtifact, compactReplacement \? 'compact' : 'detailed', compactReplacement \? compactTaskCount : undefined\)/);
});

test('Stage 2 explicitly requests the isolated required-spec contract', async () => {
  const source = await readFile(new URL('../src/components/import/FeatureImportModal.tsx', import.meta.url), 'utf8');
  assert.match(source, /'workspace-write', 'spec'\)/);
  assert.match(source, /do not edit application source, tests, configuration, infrastructure, or existing feature specs/);
});

test('bounded delivery uses an isolated agent run and rejects an artifact with the wrong task count', async () => {
  const source = await readFile(new URL('../connector/server.mjs', import.meta.url), 'utf8');
  assert.match(source, /const COMPACT_DELIVERY_MODE = 'compact'/);
  assert.match(source, /startIsolatedArtifactGeneration\(root, selected, prompt, agent, requiredArtifact, deliveryPlanMode, requestedCompactTaskCount\)/);
  assert.match(source, /Codex created \$\{actualCount\} tasks, but this bounded plan requires exactly \$\{expectedCount\}/);
  assert.match(source, /all sandbox changes were discarded/);
  assert.match(source, /payload\.deliveryPlanMode/);
});

test('the UI routes bounded planning through the selected agent and preserves the requested count', async () => {
  const source = await readFile(new URL('../src/components/journey/FeatureJourney.tsx', import.meta.url), 'utf8');
  assert.match(source, /Run \$\{executionLabel\} to create an exact \$\{compactTaskCount\}-task delivery plan/);
  assert.match(source, /Bounded Codex plan/);
  assert.match(source, /compactReplacement \? 'compact' : 'detailed', compactReplacement \? compactTaskCount : undefined/);
});

test('the installable connector package includes every local connector module its entrypoint imports', async () => {
  const source = await readFile(new URL('../scripts/package-local-connector.mjs', import.meta.url), 'utf8');
  for (const module of ['githubMilestone.mjs', 'featureIdentityMigration.mjs', 'agentPrompt.mjs', 'httpProtocol.mjs', 'ttlCache.mjs', 'specKitArtifacts.mjs']) {
    assert.match(source, new RegExp(`'${module.replace('.', '\\.')}'`));
  }
});
