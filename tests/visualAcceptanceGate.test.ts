import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const connectorPath = new URL('../connector/server.mjs', import.meta.url);
const connectorClientPath = new URL('../src/lib/connector.ts', import.meta.url);
const refineryPath = new URL('../src/components/refinery/OutcomeRefinery.tsx', import.meta.url);
const journeyPath = new URL('../src/components/journey/FeatureJourney.tsx', import.meta.url);

test('Outcome Refinery presents the feature and one state-specific repair action before operational detail', async () => {
  const source = await readFile(refineryPath, 'utf8');
  assert.match(source, /Outcome Refinery · feature in focus/);
  assert.match(source, /Your one next action/);
  assert.match(source, /Compare → diagnose → repair → verify/);
  assert.match(source, /How the repair stays safe/);
  assert.match(source, /Prepare another iteration/);
  assert.doesNotMatch(source, /function RepairStatusSummary/);
});

test('connector rejects marker-only visual checks and requires retained, measured screenshot evidence', async () => {
  const source = await readFile(connectorPath, 'utf8');
  assert.match(source, /\['visual:verify', 'test:visual', 'verify:visual'\]/);
  assert.match(source, /width: 1440, height: 900/);
  assert.match(source, /width: 390, height: 844/);
  assert.match(source, /Studio will not promote ordinary tests as visual proof/);
  assert.match(source, /\/v1\/feature\/visual-verify/);
  assert.match(source, /STUDIO_VISUAL_EVIDENCE_DIR/);
  assert.match(source, /STUDIO_VISUAL_REPORT_PATH/);
  assert.match(source, /Visual verifier did not produce STUDIO_VISUAL_REPORT_PATH/);
  assert.match(source, /schemaVersion !== VISUAL_EVIDENCE_SCHEMA_VERSION/);
  assert.match(source, /comparison\?\.passed !== true/);
  assert.match(source, /screenshot is missing or too small/);
  assert.match(source, /reference image URLs in order/);
  assert.match(source, /replace\(\/\^https\?:\\\/\\\/\[\^@\/\]\+@\/i, 'https:\/\/'\)/);
});

test('connector owns the visual host lifecycle so users never need to configure a base URL', async () => {
  const source = await readFile(connectorPath, 'utf8');
  assert.match(source, /startLocalVisualHost/);
  assert.match(source, /studio:visual:start', 'visual:start', 'dev', 'start'/);
  assert.match(source, /STUDIO_VISUAL_BASE_URL: baseUrl/);
  assert.match(source, /const LOCAL_VISUAL_HOST = 'localhost'/);
  assert.match(source, /http:\/\/\$\{LOCAL_VISUAL_HOST\}:\$\{port\}/);
  assert.match(source, /--host', LOCAL_VISUAL_HOST/);
  assert.match(source, /waitForVisualHost/);
  assert.match(source, /onSettled: async \(\) => stopVisualHost\(host\)/);
  assert.match(source, /rather than asking the user to provide an env var/i);
});

test('Studio uses localhost consistently for local SSO-safe browser origins', async () => {
  const [connector, client] = await Promise.all([readFile(connectorPath, 'utf8'), readFile(connectorClientPath, 'utf8')]);
  assert.match(connector, /server\.listen\(PORT, 'localhost'/);
  assert.match(connector, /const LOCAL_VISUAL_HOST = 'localhost'/);
  assert.match(client, /DEFAULT_CONNECTOR_URL = 'http:\/\/localhost:4318'/);
  assert.match(client, /replace\(\/\^http:\\\/\\\/127\\\.0\\\.0\\\.1/);
});

test('visual repairs prepare declared npm dependencies before consuming a repair attempt', async () => {
  const connector = await readFile(connectorPath, 'utf8');
  const refinery = await readFile(refineryPath, 'utf8');
  assert.match(connector, /function startFeatureVisualPreparation/);
  assert.match(connector, /undeclaredVisualCommandDependencies/);
  assert.match(connector, /install', '--save-dev', \.\.\.missingVisualDependencies/);
  assert.match(connector, /900_000/);
  assert.match(connector, /Visual prerequisites/);
  assert.match(connector, /\/v1\/feature\/visual-prepare/);
  assert.match(refinery, /startFeatureVisualPreparation/);
  assert.match(refinery, /No repair attempt was consumed/);
});

test('Outcome Refinery runs the visual gate whenever its binding contract requires it and retries failures', async () => {
  const source = await readFile(refineryPath, 'utf8');
  assert.match(source, /## Visual acceptance/i);
  assert.match(source, /startFeatureVisualVerification/);
  assert.match(source, /visual-verification-failed/);
  assert.match(source, /visualVerificationJobId/);
});

test('binding contracts use a readable, wrapping semantic document surface instead of a low-contrast code panel', async () => {
  const source = await readFile(refineryPath, 'utf8');
  assert.match(source, /data-outcome-contract role="document"/);
  assert.match(source, /backgroundColor: 'var\(--theme-surface\)'/);
  assert.match(source, /color: 'var\(--theme-text\)'/);
  assert.match(source, /whitespace-pre-wrap break-words/);
  assert.doesNotMatch(source, /<pre data-outcome-contract/);
});

test('a decision-required repair exposes one explicit next step and focuses the mismatch field', async () => {
  const source = await readFile(refineryPath, 'utf8');
  assert.match(source, /Your one next action/);
  assert.match(source, /Describe the mismatch/);
  assert.match(source, /deliveredOutcomeRef\.current\?\.focus/);
  assert.match(source, /status === 'needs-decision'/);
});

test('Outcome Refinery keeps live autopilot progress and safe stopping beside the initiating action', async () => {
  const source = await readFile(refineryPath, 'utf8');
  assert.match(source, /import \{ AgentJobStatus \}/);
  assert.match(source, /AutopilotControlCenter/);
  assert.match(source, /aria-label="Autopilot control center"/);
  assert.match(source, /<AgentJobStatus job=\{job\}/);
  assert.match(source, /Outcome Refinery is repairing the linked worktree/);
  assert.match(source, /Stop autopilot/);
  assert.match(source, /Stopped by the user before the local process began/);
});

test('a passed visual repair exposes retained two-viewport evidence rather than a bare success label', async () => {
  const source = await readFile(refineryPath, 'utf8');
  assert.match(source, /Visual evidence retained/);
  assert.match(source, /autopilotJob\.evidence\.visual\.artifacts/);
  assert.match(source, /mismatch \{artifact\.mismatchRatio\}/);
});

test('a successful outcome repair explains why Design safely reopened and provides one focused next action', async () => {
  const source = await readFile(journeyPath, 'utf8');
  assert.match(source, /Outcome repair passed its automated gates/);
  assert.match(source, /You do not need to rerun the repaired implementation/);
  assert.match(source, /Prepare refreshed architecture plan/);
  assert.match(source, /activeFeature\?\.outcomeRefinery\?\.status === 'verifying'/);
});
