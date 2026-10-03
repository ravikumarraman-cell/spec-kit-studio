import assert from 'node:assert/strict';
import test from 'node:test';
import { deterministicStudioGuideReply, sanitizeStudioGuideText, STUDIO_GUIDE_QUESTION_LIMIT, STUDIO_GUIDE_RESPONSE_LIMIT, studioGuideContext, studioGuideWelcome } from '../src/lib/studioGuide';
import { readFile } from 'node:fs/promises';
import { createProjectWorkspace } from '../src/lib/projectFactory';
import { createFeatureJourney } from '../src/lib/featureJourney';

const context = { screen: 'tasks' as const, projectName: 'Example', stage: { id: 5, title: 'Plan delivery', ready: false, readyHint: 'Create and review delivery tasks.' } };

test('Studio Guide redacts credential-shaped values and bounds user context', () => {
  const result = sanitizeStudioGuideText('STUDIO_CONNECTOR_TOKEN=very-secret-value Why did this fail?');
  assert.match(result, /redacted credential/);
  assert.doesNotMatch(result, /very-secret-value/);
  assert.equal(sanitizeStudioGuideText('x'.repeat(20), 8), 'xxxxxxxx');
  assert.equal(sanitizeStudioGuideText('x'.repeat(STUDIO_GUIDE_QUESTION_LIMIT + 1)).length, STUDIO_GUIDE_QUESTION_LIMIT);
  assert.ok(STUDIO_GUIDE_RESPONSE_LIMIT <= 1_800);
});

test('Studio Guide resolves recurring safe remediations without an LLM request', () => {
  assert.match(deterministicStudioGuideReply('Why is my connector version old?', context) || '', /Check installed version now/);
  assert.match(deterministicStudioGuideReply('Can I approve this?', context) || '', /Do not approve Stage 5/);
  assert.match(deterministicStudioGuideReply('The visual acceptance contract says No Source', context) || '', /generic card grid/i);
  assert.match(deterministicStudioGuideReply('Artifact check: missing required structure', context) || '', /Do not approve the stage/i);
  assert.match(studioGuideWelcome(context).content, /Stage 5/);
  assert.match(studioGuideWelcome(context).content, /token-light/i);
});

test('Studio Guide prioritizes a paused Outcome Refinery over generic stage narration', () => {
  const repairContext = {
    ...context,
    stage: { id: 4, title: 'Design safely', ready: true, readyHint: 'Review the architecture plan.' },
    outcomeRepair: { status: 'needs-decision', attemptCount: 2, maxAttempts: 2, stopReason: 'Visual verification stopped before evidence was retained.' },
  };
  const answer = deterministicStudioGuideReply('Explain the current stage and what should I do next?', repairContext) || '';
  assert.match(answer, /Outcome Refinery is paused/i);
  assert.match(answer, /Do not approve Design safely yet/i);
  assert.match(answer, /Prepare another iteration/i);
  assert.doesNotMatch(answer, /architecture-plan review/i);
});

test('Studio Guide sends bounded task state so a named task can be explained without repository contents', () => {
  const project = createProjectWorkspace('Example', 'Example project');
  project.featureInbox = [{
    id: 'feature-1', title: 'Tenant summary', summary: 'Summary', source: 'text', importedAt: '', userStoryIds: [], requirementIds: [], taskIds: [],
    deliveryPlan: { content: '- [x] T001 Map the source\n- [ ] T005 Verify narrow layout' },
    implementationReceipts: [{ taskId: 'T001', recordedAt: '', jobId: 'job-1', changedFiles: [], diffStat: '', verificationSummary: 'Reviewed.' }],
  }];
  project.journey = { ...createFeatureJourney(), featureId: 'feature-1' };

  assert.deepEqual(studioGuideContext(project, 'tasks').tasks, [
    { id: 'T001', state: 'reviewed', title: 'Map the source' },
    { id: 'T005', state: 'planned', title: 'Verify narrow layout' },
  ]);
});

test('Studio Guide keeps optional screen comparison collapsed until the user needs it', async () => {
  const source = await readFile(new URL('../src/components/common/StudioGuide.tsx', import.meta.url), 'utf8');
  assert.match(source, /const \[visualReviewOpen, setVisualReviewOpen\] = useState\(false\)/);
  assert.match(source, /<details open=\{visualReviewOpen\}/);
  assert.match(source, /setVisualReviewOpen\(true\)/);
  assert.match(source, /Optional visual review/);
});

test('Studio Guide renders model prose as readable paragraphs, emphasis, and numbered actions', async () => {
  const [component, styles] = await Promise.all([
    readFile(new URL('../src/components/common/StudioGuide.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/index.css', import.meta.url), 'utf8'),
  ]);
  assert.match(component, /function GuideMessageContent/);
  assert.match(component, /split\(\/\\s\+\(\?=\\d\+\\\.\\s\)\//);
  assert.match(component, /<ol>/);
  assert.match(component, /GuideInlineText/);
  assert.match(styles, /\.studio-guide__message ol/);
  assert.match(styles, /\.studio-guide__message strong/);
});
