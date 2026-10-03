import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('completed developer delivery distinguishes engine artifacts, review evidence, code, and explicitly published PRs', async () => {
  const [handoff, journey, exporter, publisher, connector] = await Promise.all([
    readFile(new URL('../src/components/journey/FeatureDeliveryHandoff.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/journey/FeatureJourney.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/exporter/CliExporter.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/journey/PullRequestPublication.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../connector/server.mjs', import.meta.url), 'utf8'),
  ]);

  assert.match(handoff, /1\. Engine-compatible feature package/);
  assert.match(handoff, /2\. Review evidence/);
  assert.match(handoff, /3\. Code handoff/);
  assert.match(handoff, /Studio never commits, pushes, merges, deploys/);
  assert.match(handoff, /Download engine-compatible feature package/);
  assert.match(handoff, /Download delivery evidence/);
  assert.match(handoff, /Neither archive contains application code/);
  assert.match(journey, /FeatureDeliveryHandoff/);
  assert.match(journey, /href="#developer-delivery-handoff"/);
  assert.doesNotMatch(journey, /onOpenPackage=\{\(\) => onNavigate\('export'\)\}/);
  const workspaceView = await readFile(new URL('../src/app/WorkspaceView.tsx', import.meta.url), 'utf8');
  assert.match(workspaceView, /completedFeatureHandoff/);
  assert.match(workspaceView, /activeTab === 'export' && completedFeatureHandoff/);
  assert.match(workspaceView, /onNavigate\('journey'\)/);
  assert.match(exporter, /Download engine-compatible feature package/);
  assert.match(exporter, /Download delivery evidence/);
  assert.match(publisher, /Optional: create a GitHub pull request/);
  assert.match(publisher, /confirmStudioAction/);
  assert.match(publisher, /It will not commit, merge, or deploy/);
  assert.match(connector, /CREATE_DELIVERY_PUBLICATION/);
  assert.match(connector, /\['status', '--porcelain=v1', '--untracked-files=all'\]/);
  assert.match(connector, /\['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@\{u\}'\]/);
  assert.match(connector, /\['pr', 'create', '--head'/);
  assert.match(connector, /'--body-file', bodyPath/);
});
