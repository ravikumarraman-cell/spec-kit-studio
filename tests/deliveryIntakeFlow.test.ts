import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('feature intake presents a progressive flow with one reviewed preparation action', async () => {
  const modal = await readFile(new URL('../src/components/import/FeatureImportModal.tsx', import.meta.url), 'utf8');
  const sourceInput = await readFile(new URL('../src/components/import/FeatureSourceInput.tsx', import.meta.url), 'utf8');
  const progress = await readFile(new URL('../src/components/import/DeliveryIntakeProgress.tsx', import.meta.url), 'utf8');
  const action = await readFile(new URL('../src/components/import/DeliveryIntakeAction.tsx', import.meta.url), 'utf8');

  assert.match(modal, /<DeliveryIntakeProgress/);
  assert.match(modal, /<FeatureSourceInput[\s\S]*showPrimaryAction=\{false\}/);
  assert.match(modal, /<DeliveryIntakeAction/);
  assert.match(modal, /onPresetSelect=\{\(content, title\) => \{[\s\S]*setFeatureContent\(content\);[\s\S]*\}\}/);
  assert.match(progress, /Choose scope/);
  assert.match(progress, /Describe the outcome/);
  assert.match(progress, /Review and start/);
  assert.match(action, /does not implement application code at this step/);
  assert.match(modal, /useState<FeatureImportSource>\('github'\)/);
  assert.match(sourceInput, /onSourceChange\('github'\)[\s\S]*onSourceChange\('text'\)/);
  assert.doesNotMatch(modal, /<details open=/);
  assert.match(modal, /integrationsApi\.githubAppStatus\(\)/);
  assert.match(modal, /readEnterpriseGitHubSource\(githubUrl\)/);
  assert.match(sourceInput, /showInlineGitHubLoad/);
  assert.match(sourceInput, /Load GitHub \$\{githubReference === 'issues' \? 'issue' : 'milestone'\}/);
  assert.match(sourceInput, /sm:flex-row/);
  assert.match(modal, /setFocusNextDeliveryAction\(true\)/);
  assert.match(modal, /deliveryActionRef\.current/);
  assert.match(modal, /scrollIntoView\(\{ behavior: 'smooth', block: 'center' \}\)/);
  assert.match(await readFile(new URL('../src/components/import/ImportNotice.tsx', import.meta.url), 'utf8'), /useRevealOnChange/);
  assert.match(await readFile(new URL('../src/components/common/ActionErrorNotice.tsx', import.meta.url), 'utf8'), /useRevealOnChange/);
});

test('adding a reviewed feature saves it and opens the selected persona review in one action', async () => {
  const modal = await readFile(new URL('../src/components/import/FeatureImportModal.tsx', import.meta.url), 'utf8');
  const preview = await readFile(new URL('../src/components/import/FeatureExtractionPreview.tsx', import.meta.url), 'utf8');
  const shell = await readFile(new URL('../src/app/useStudioShell.ts', import.meta.url), 'utf8');

  assert.match(modal, /const saved = onMergeIntoActiveProject/);
  assert.match(modal, /onClose\(\);/);
  assert.match(modal, /mergeLabel=\{isProductManagerIntake \? 'Add and review with Product Manager' : 'Add to this Journey'\}/);
  assert.match(preview, /mergeLabel = 'Add to this Journey'/);
  assert.doesNotMatch(preview, /Add feature to this workspace/);
  assert.doesNotMatch(preview, /Open Feature Journey/);
  assert.match(shell, /if \(saved\) setActiveTab\(route \? 'personas' : 'journey'\)/);
});
