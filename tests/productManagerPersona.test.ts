import assert from 'node:assert/strict';
import test from 'node:test';
import { ProductOutcomePackage } from '../src/types/speckit';
import { createProductOutcomeDraft, productManagerArtifactAdapter, productManagerPrompt, renderProductOutcomeMarkdown } from '../src/lib/personas/productManagerArtifacts';
import { developerHandoffMarkdown } from '../src/lib/personas/productManagerHandoff';
import { productManagerRecommendation } from '../src/lib/personas/productManagerPolicy';
import { personaArtifactAdapter, personaDefinition, personaDefinitions, personaModule, personaModuleIssues, personaModules, personaRegistryIssues } from '../src/lib/personas/registry';
import { readFileSync } from 'node:fs';
import { localProductSpecDraft } from '../src/lib/personas/localProductSpecDraft';
import { createDeveloperArchitectureDraft, developerArchitectureIssue, renderDeveloperArchitectureMarkdown } from '../src/lib/personas/developerArchitectureArtifacts';
import { developerArchitectureHandoffMarkdown } from '../src/lib/personas/developerArchitectureHandoff';
import { businessAnalysisIssue, createBusinessAnalysisDraft } from '../src/lib/personas/businessAnalysisArtifacts';
import { createSecurityResearchDraft, securityResearchIssue } from '../src/lib/personas/securityResearchArtifacts';
import { personaCatalog } from '../src/lib/personas/catalog';
import { createFeatureInboxItem } from '../src/lib/featureInbox';
import { engineProjectionIssue } from '../src/lib/personas/specKitProjection';
import { createProjectWorkspace } from '../src/lib/projectFactory';
import { availablePersonaInputs, personaConsumptionPacket, personaHandoffRecipients } from '../src/lib/personas/consumption';
import { personaHandoffDefinition, personaHandoffRecipientText } from '../src/lib/personas/handoff';
import { createPersonaHandoffArchive, createReviewedDeliveryHandoffArchive, handoffArtifactPayload, readPersonaHandoff, readStudioHandoff, studioHandoffImportRule, studioHandoffImportRules } from '../src/lib/personas/portableHandoff';
import { resumablePersonaRoute } from '../src/lib/personas/context';
import { continueJourneyFromHandoff, featureHandoffContinuation, personaHandoffContinuation, personaHandoffIntake } from '../src/lib/personas/handoffContinuation';
import { completeJourneyPrerequisite, createFeatureJourney, featureJourneyStages } from '../src/lib/featureJourney';
import { technicalRoleDefinition, technicalRoleForFeature } from '../src/lib/personas/technicalRoles';
import { isStageContextRelevant } from '../src/lib/stageContentPolicy';
import { isSharedFeatureJourneyActive, personaHandoffPolicy, personaWorkflowCurrentStep, personaWorkflowRuleIssues, personaWorkflowRules, resolveWorkingPersona, sharedFeatureJourneyRule, shouldShowPersonaHandoffNavigation } from '../src/lib/personas/workflowPolicy';
import { REVIEWED_DELIVERY_MANIFEST, REVIEWED_DELIVERY_REQUIREMENTS_PATH, REVIEWED_DELIVERY_SOURCE_PATH, REVIEWED_DELIVERY_STORIES_PATH, reviewedDeliveryHandoffPackage } from '../src/lib/personas/reviewedDeliveryHandoff';
import { requirementsFromCanonicalSpecification, specificationFromProductOutcome, specificationFromReviewedDelivery, storiesFromCanonicalSpecification } from '../src/lib/personas/productManagerSpecification';
import { sddEngineDeliverableProfile, sddEngineRoleHandoff } from '../src/lib/sddEngineDeliverables';
import JSZip from 'jszip';

const now = '2026-09-28T12:00:00.000Z';
const context = { title: 'Tenant summary', path: 'studio/tenant-summary/product-brief.md', now };
const output = JSON.stringify({
  title: 'Tenant summary', targetUsers: ['Cloud executive'], problem: 'Health evidence is fragmented.', desiredOutcome: 'A decisive tenant summary.',
  nonGoals: ['Replace the detailed view'], successMeasures: [{ id: 'SM-1', metric: 'Decision time', target: 'under 2 minutes', sourceOfTruth: 'Research', cadence: 'monthly' }],
  assumptions: [{ id: 'A-1', statement: 'Tenant evidence is available.', owner: 'Product' }], decisions: [{ id: 'D-1', statement: 'Keep the detailed route.', status: 'decided', owner: 'Product' }], acceptanceAnchors: [{ id: 'AC-1', statement: 'Show risks, readiness, and a detailed-view route.' }],
});

test('Product Manager adapter retains structured, reviewable, and developer-ready evidence', () => {
  const artifact = productManagerArtifactAdapter.parse(`Agent note:\n${output}`, context);
  assert.ok(artifact);
  assert.equal(artifact.desiredOutcome, 'A decisive tenant summary.');
  assert.equal(artifact.path, context.path);
  assert.match(artifact.markdown, /## Acceptance anchors/);
  assert.equal(artifact.specKitProjection.kind, 'spec');
  assert.match(artifact.specKitProjection.path, /^specs\/tenant-summary\/spec\.md$/);
  assert.match(artifact.specKitProjection.content, /# Feature Specification:/);
  assert.match(artifact.specKitProjection.content, /## Functional Requirements/);
  assert.match(developerHandoffMarkdown({ ...artifact, acceptedAt: now }), /Approved product handoff/);
  assert.match(renderProductOutcomeMarkdown(artifact), /Decision time/);
  assert.equal(productManagerArtifactAdapter.parse('{"problem":"missing outcome"}', context), undefined);
  assert.match(productManagerPrompt('Tenant summary', 'A concise executive view'), /read-only/i);
  assert.match(productManagerPrompt('Tenant summary', 'A concise executive view'), /Return ONLY one valid JSON object/);
});

test('Product Manager policy is explicit and never turns persona work into a hidden requirement', () => {
  const feature = { id: 'F-1', title: 'Tenant summary', summary: 'Executive view', source: 'text' as const, importedAt: now, requirementIds: [], userStoryIds: [], taskIds: [] };
  assert.equal(productManagerRecommendation(feature).engagement, 'recommended');
  assert.equal(productManagerRecommendation({ ...feature, productManagerDecision: { personaId: 'product-manager', status: 'skipped', reason: 'Existing research approved', recordedAt: now } }).engagement, 'skipped');
  const outcome = productManagerArtifactAdapter.parse(output, context) as ProductOutcomePackage;
  assert.equal(productManagerRecommendation({ ...feature, productOutcome: { ...outcome, acceptedAt: now } }).engagement, 'complete');
});

test('every persona declares its primary handoff and optional exploration route in the central workflow registry', () => {
  for (const persona of personaDefinitions) {
    const rule = personaWorkflowRules[persona.id];
    assert.equal(rule.personaId, persona.id);
    assert.ok(rule.primaryRecipient);
    assert.ok(rule.recipientEntry);
    assert.ok(rule.primaryLabel);
    assert.ok(rule.primaryActionDescription);
    assert.ok(rule.completionLabel);
    assert.ok(rule.continuationBehavior);
    assert.ok(rule.completionGuidance);
    assert.ok(rule.journeyContext);
    assert.ok(rule.technicalDesignAccess);
    assert.equal(rule.exploration.destination, 'journey');
    assert.ok(rule.exploration.label);
    assert.deepEqual(personaWorkflowRuleIssues(rule), []);
    assert.ok(rule.mandatoryStages.length >= 3);
    assert.equal(rule.mandatoryStages.at(-1)?.kind, 'handoff');
    assert.ok(rule.mandatoryStages.some((stage) => stage.kind === 'intake'));
    assert.ok(rule.mandatoryStages.some((stage) => stage.kind === 'review'));
    assert.ok(rule.mandatoryStages.every((stage) => stage.required && stage.completionEvidence));
    assert.ok(rule.optionalStages.some((stage) => stage.kind === 'shared-journey' && !stage.required));
  }

  const reviewedImport = createFeatureInboxItem({ title: 'Reviewed source', summary: 'Ready for a product decision.', userStories: [{ id: 'US-001', title: 'Review source', asA: 'Product Manager', iWantTo: 'review a source', soThat: 'I can hand it off', acceptanceCriteria: [], priority: 'High' }], functionalRequirements: [{ id: 'FR-001', title: 'Retain source', description: 'The source remains available for review.', category: 'Core', priority: 'High' }], tasks: [] }, 'github', 0, now);
  reviewedImport.productManagerDecision = { personaId: 'product-manager', status: 'accepted', reason: 'Reviewed source.', recordedAt: now };
  const handoff = personaHandoffPolicy(reviewedImport, 'product-manager');
  assert.equal(handoff?.kind, 'reviewed-delivery');
  assert.equal(handoff?.nextPersona, 'developer');
  assert.equal(handoff?.continueLabel, 'Preview developer next step');
  assert.equal(handoff?.completionLabel, 'Done with product review');
  assert.match(handoff?.primaryActionDescription || '', /does not change a repository/i);
});

test('returning to a persona handoff pauses shared delivery without deleting retained feature evidence', () => {
  const workspaceHook = readFileSync(new URL('../src/hooks/useProjectWorkspace.ts', import.meta.url), 'utf8');
  const shell = readFileSync(new URL('../src/app/useStudioShell.ts', import.meta.url), 'utf8');
  assert.match(workspaceHook, /const returnToPersonaHandoff/);
  assert.match(workspaceHook, /journey: undefined/);
  assert.match(workspaceHook, /journey: project\.journey/);
  assert.match(shell, /workspace\.returnToPersonaHandoff\(featureId\)/);
  assert.match(shell, /setActiveTab\('overview'\)/);
});

test('the engine deliverable registry makes role boundaries explicit and future adapters fail closed', () => {
  const profile = sddEngineDeliverableProfile('github-spec-kit');
  assert.equal(profile.supported, true);
  assert.deepEqual(profile.completePackageDeliverableIds, ['feature-specification', 'implementation-plan', 'implementation-tasks']);
  assert.deepEqual(sddEngineRoleHandoff('github-spec-kit', 'product-manager')?.deliverable, profile.deliverables[0]);
  assert.equal(sddEngineRoleHandoff('github-spec-kit', 'business-analyst')?.deliverable.kind, 'spec');
  assert.equal(sddEngineRoleHandoff('github-spec-kit', 'architect')?.deliverable.kind, 'plan');
  assert.equal(sddEngineRoleHandoff('github-spec-kit', 'developer-delivery')?.deliverable.kind, 'tasks');
  assert.equal(sddEngineRoleHandoff('github-spec-kit', 'security-researcher')?.deliverable.kind, 'research');
  assert.equal(sddEngineDeliverableProfile('openspec').supported, false);
});

test('persona workflow registry preserves the mandatory role boundaries', () => {
  const productManager = personaWorkflowRules['product-manager'];
  assert.deepEqual(productManager.mandatoryStages.map((stage) => stage.id), [
    'select-product-input', 'review-product-outcome', 'handoff-product-context',
  ]);
  assert.match(productManager.mandatoryStages[1].completionEvidence, /Product Brief|PM review decision/);

  const developer = personaWorkflowRules.developer;
  assert.deepEqual(developer.mandatoryStages.map((stage) => stage.id), [
    'choose-technical-ownership', 'ground-repository-context', 'approve-technical-design', 'handoff-technical-context',
  ]);
  assert.match(developer.mandatoryStages[3].description, /Architects stop here/);
  assert.match(developer.mandatoryStages[3].completionEvidence, /normally stage 5/);

  assert.match(personaWorkflowRules['business-analyst'].mandatoryStages[1].completionEvidence, /Business Analysis/);
  assert.match(personaWorkflowRules['security-researcher'].mandatoryStages[1].completionEvidence, /Security Review/);
});

test('every persona workspace exposes a registry-backed next step and a concise expandable role path', () => {
  for (const persona of personaDefinitions) {
    assert.equal(personaWorkflowCurrentStep(undefined, persona.id), 0);
    const feature = createFeatureInboxItem({ title: `${persona.label} feature`, userStories: [], functionalRequirements: [], tasks: [] }, 'text', 0, now);
    assert.equal(personaWorkflowCurrentStep(feature, persona.id), 1);
  }
  const workspace = readFileSync(new URL('../src/components/personas/PersonaWorkspace.tsx', import.meta.url), 'utf8');
  const progress = readFileSync(new URL('../src/components/personas/PersonaWorkflowProgress.tsx', import.meta.url), 'utf8');
  assert.match(workspace, /<PersonaWorkflowProgress project=\{project\} personaId=\{personaId\}/);
  assert.match(progress, /personaWorkflowCurrentStep/);
  assert.match(progress, /Review complete/);
  assert.match(progress, /Your handoff is ready/);
  assert.match(progress, /No further review is required from you/);
  assert.match(progress, /View the full role path/);
  assert.match(progress, /Complete when:/);
  assert.match(workspace, /<ReceivingRolePreview senderLabel=\{personaCatalogEntry\(personaId\)\.label\}/);
  assert.match(workspace, /setShowRecipientPreview\(true\)/);
  assert.match(workspace, /workflowRule\.continuationBehavior === 'preview-recipient'/);
  assert.match(workspace, /onOpenRecipient=\{\(\) => onStartPersona\(handoff\.nextPersona\)\}/);
  assert.match(workspace, /onExploreSharedJourney\(feature\.id\); onNavigate\('journey'\)/);
  assert.match(workspace, /onSaveTechnicalRole\(feature\.id, 'developer'\); onExploreSharedJourney\(feature\.id\);/);
  const journey = readFileSync(new URL('../src/components/journey/FeatureJourney.tsx', import.meta.url), 'utf8');
  assert.match(journey, /Technical design belongs to Developer \/ Architect/);
  assert.match(journey, /personaMayOwnTechnicalDesign/);
  const shell = readFileSync(new URL('../src/app/useStudioShell.ts', import.meta.url), 'utf8');
  assert.match(shell, /const startHandoffJourney/);
  assert.match(shell, /workspace\.startJourneyFromPersonaHandoff\(featureId, personaId\)/);
});

test('workflow configuration validator rejects bypassable or incomplete persona definitions', () => {
  const valid = personaWorkflowRules['product-manager'];
  assert.ok(personaWorkflowRuleIssues({ ...valid, mandatoryStages: [] }).some((issue) => /mandatory stage/.test(issue)));
  assert.ok(personaWorkflowRuleIssues({ ...valid, mandatoryStages: valid.mandatoryStages.slice(0, -1) }).some((issue) => /handoff stage/.test(issue)));
  assert.ok(personaWorkflowRuleIssues({ ...valid, primaryRecipient: 'product-manager' }).some((issue) => /different primary recipient/.test(issue)));
  assert.ok(personaWorkflowRuleIssues({ ...valid, optionalStages: [] }).some((issue) => /optional shared-Journey/.test(issue)));
  assert.ok(personaWorkflowRuleIssues({ ...valid, downloadSuffix: '' }).some((issue) => /exportable handoff package/.test(issue)));
});

test('a PM-reviewed imported delivery has the same inspectable ZIP package contract as every accepted persona handoff', async () => {
  assert.equal(studioHandoffImportRule('studio-reviewed-delivery-handoff').requiredEngineArtifact, 'spec');
  assert.deepEqual(Object.keys(studioHandoffImportRules).sort(), ['studio-persona-handoff', 'studio-reviewed-delivery-handoff']);
  const project = createProjectWorkspace('Reviewed delivery', 'Handoff package contract');
  const feature = createFeatureInboxItem({ title: 'Tenant summary', summary: 'Give leaders a clear summary.', sourceContent: '## Imported milestone\n\nRetain the source acceptance context.', userStories: [{ id: 'US-001', title: 'Review tenant health', asA: 'Tenant leader', iWantTo: 'review health', soThat: 'I can decide quickly', acceptanceCriteria: ['Show the status'], priority: 'High' }], functionalRequirements: [{ id: 'FR-001', title: 'Show status', description: 'Display the retained tenant status.', category: 'Core', priority: 'High' }], tasks: [] }, 'github', 0, now);
  feature.productManagerDecision = { personaId: 'product-manager', status: 'accepted', reason: 'The imported package is sufficiently clear.', recordedAt: now };
  project.featureInbox = [feature];
  project.spec.userStories = [{ id: 'US-001', title: 'Review tenant health', asA: 'Tenant leader', iWantTo: 'review health', soThat: 'I can decide quickly', acceptanceCriteria: ['Show the status'], priority: 'High' }];
  project.spec.functionalRequirements = [{ id: 'FR-001', title: 'Show status', description: 'Display the retained tenant status.', category: 'Core', priority: 'High' }];
  feature.specification = specificationFromReviewedDelivery(project, feature, feature.productManagerDecision);

  const preview = reviewedDeliveryHandoffPackage(project, feature);
  assert.match(preview.markdown, /Product Manager decision/);
  assert.deepEqual(preview.archivePaths, [REVIEWED_DELIVERY_MANIFEST, 'README.md', 'handoff/reviewed-delivery.md', REVIEWED_DELIVERY_STORIES_PATH, REVIEWED_DELIVERY_REQUIREMENTS_PATH, `specs/${feature.slug}/spec.md`, REVIEWED_DELIVERY_SOURCE_PATH]);
  assert.equal(preview.specificationPath, `specs/${feature.slug}/spec.md`);
  assert.match(preview.specificationContent || '', /^# Feature Specification:/m);
  const archive = await createReviewedDeliveryHandoffArchive(project, feature);
  const zip = await JSZip.loadAsync(await archive.arrayBuffer());
  for (const path of preview.archivePaths) assert.ok(zip.file(path), `missing ${path}`);
  assert.match(await zip.file(preview.path)!.async('string'), /The imported package is sufficiently clear/);
  assert.match(await zip.file(REVIEWED_DELIVERY_STORIES_PATH)!.async('string'), /US-001/);
  assert.match(await zip.file(REVIEWED_DELIVERY_REQUIREMENTS_PATH)!.async('string'), /FR-001/);
  const restored = await readStudioHandoff(new File([archive], 'reviewed-delivery.zip', { type: 'application/zip' }));
  assert.equal(restored.packageType, 'studio-reviewed-delivery-handoff');
  if (restored.packageType === 'studio-reviewed-delivery-handoff') {
    assert.equal(restored.review.status, 'accepted');
    assert.equal(restored.specification?.path, `specs/${feature.slug}/spec.md`);
    assert.match(restored.specification?.content || '', /^# Feature Specification:/m);
    assert.deepEqual(restored.delivery?.userStories.map((story) => story.id), ['US-001']);
    assert.deepEqual(restored.delivery?.functionalRequirements.map((requirement) => requirement.id), ['FR-001']);
  }
});

test('canonical PM specifications can recover only explicit requirement records from legacy handoffs', () => {
  assert.deepEqual(
    requirementsFromCanonicalSpecification('# Feature\n\n- **FR-001**: System MUST retain reviewed delivery scope.\n- **FR-002**: The feature MUST preserve traceability.'),
    [
      { id: 'FR-001', title: 'retain reviewed delivery scope.', description: 'System MUST retain reviewed delivery scope.', category: 'Core', priority: 'High' },
      { id: 'FR-002', title: 'preserve traceability.', description: 'The feature MUST preserve traceability.', category: 'Core', priority: 'High' },
    ],
  );
});

test('canonical PM specifications can recover explicitly declared user stories from legacy handoffs', () => {
  const stories = storiesFromCanonicalSpecification('# Feature\n\n### User Story 1 - Review tenant health (Priority: P1)\n\nAs a Tenant leader, I want to review health, so that I can decide quickly.\n\n**Independent Test**: Show the status\n\n## Requirements');
  assert.deepEqual(stories, [{ id: 'US-001', title: 'Review tenant health', priority: 'High', asA: 'Tenant leader', iWantTo: 'review health', soThat: 'I can decide quickly', acceptanceCriteria: ['Show the status'] }]);
});

test('every accepted persona artifact exports an inspectable and importable ZIP handoff', async () => {
  const project = createProjectWorkspace('Persona archive matrix', 'Every role exports the same durable handoff boundary.');
  const feature = createFeatureInboxItem({ title: 'Tenant summary', summary: 'Give leaders a clear summary.', userStories: [], functionalRequirements: [], tasks: [] }, 'text', 0, now);
  const root = `studio/${feature.slug}`;
  feature.productOutcome = { ...createProductOutcomeDraft(feature.title, feature.summary, `${root}/product-brief.md`, now), acceptedAt: now };
  feature.businessAnalysis = { ...createBusinessAnalysisDraft(feature.title, feature.summary, 'feature', `${root}/business-analysis.md`, now), acceptedAt: now };
  feature.developerArchitecture = { ...createDeveloperArchitectureDraft(feature.title, feature.summary, 'feature', [], `${root}/technical-decision.md`, now), acceptedAt: now };
  feature.securityResearch = { ...createSecurityResearchDraft(feature.title, 'feature', `${root}/security-research.md`, now), acceptedAt: now };
  project.featureInbox = [feature];

  for (const personaId of personaDefinitions.map((persona) => persona.id)) {
    const archive = await createPersonaHandoffArchive(project, feature, personaId);
    const handoff = await readPersonaHandoff(new File([archive], `${personaId}.zip`, { type: 'application/zip' }));
    assert.equal(handoff.artifact.personaId, personaId);
    assert.ok(handoff.artifact.path);
    assert.ok(handoff.artifact.markdown);
    assert.ok(handoff.artifact.specKitProjection.path);
  }
});

test('Product Manager can begin a reviewable outcome without a connected workspace', () => {
  const draft = createProductOutcomeDraft('Tenant summary', 'Leaders lack one clear tenant view.', context.path, now);
  assert.equal(draft.problem, 'Leaders lack one clear tenant view.');
  assert.equal(draft.acceptedAt, undefined);
  assert.match(draft.markdown, /## Desired outcome/);
  assert.match(draft.markdown, /## Acceptance anchors/);
});

test('accepted PM work persists a canonical feature-owned spec rather than a Studio-only projection', () => {
  const feature = createFeatureInboxItem({ title: 'Tenant summary', summary: 'Leaders need a concise view.', userStories: [], functionalRequirements: [], tasks: [] }, 'text', 0, now);
  const outcome = { ...createProductOutcomeDraft(feature.title, feature.summary, `studio/${feature.slug}/product-brief.md`, now), acceptedAt: now };
  const specification = specificationFromProductOutcome(feature, outcome, now);
  assert.equal(specification.path, `specs/${feature.slug}/spec.md`);
  assert.match(specification.content, /^## User Scenarios & Testing/m);
  assert.match(specification.content, /^## Requirements/m);
  assert.match(specification.content, /^## Success Criteria/m);
});

test('persona registry is a plug-and-play catalog with Product Manager and Developer/Architect adapters', () => {
  assert.equal(personaDefinition('product-manager').home, 'journey');
  assert.equal(personaArtifactAdapter('product-manager')?.artifactLabel, 'Product brief');
  assert.equal(personaArtifactAdapter('developer')?.artifactLabel, 'Technical decision package');
  assert.deepEqual(personaDefinitions.map((persona) => persona.id), ['product-manager', 'business-analyst', 'developer', 'security-researcher']);
});

test('every registered persona is a complete, reusable module', () => {
  assert.deepEqual(personaRegistryIssues(), []);
  assert.deepEqual(personaModules.map((module) => module.definition.id), personaDefinitions.map((persona) => persona.id));

  for (const persona of personaDefinitions) {
    const module = personaModule(persona.id);
    assert.equal(module.definition, persona);
    assert.equal(module.workflow.personaId, persona.id);
    assert.equal(module.artifactAdapter.personaId, persona.id);
    assert.deepEqual(personaModuleIssues(module), []);
  }
});

test('every persona shares the catalog-driven navigation contract', () => {
  assert.deepEqual(personaCatalog.map((persona) => persona.id), personaDefinitions.map((persona) => persona.id));
  for (const persona of personaCatalog) {
    assert.ok(persona.label);
    assert.ok(persona.summary);
    assert.ok(persona.nextAction);
    assert.equal(persona.changesCode, false);
  }
  assert.equal(personaCatalog.find((persona) => persona.id === 'developer')?.prerequisite, 'repository-evidence');
});

test('Developer/Architect package is local, bounded, reviewable, and ready for a developer handoff', () => {
  const draft = createDeveloperArchitectureDraft('Tenant summary', 'Add a concise health view.', 'user-story', ['FR-001'], 'studio/tenant-summary/technical-decision.md', now);
  assert.equal(developerArchitectureIssue(draft), undefined);
  assert.equal(draft.scope, 'user-story');
  assert.match(renderDeveloperArchitectureMarkdown(draft), /Developer guardrails/);
  assert.match(draft.specKitProjection.path, /^specs\/tenant-summary\/plan\.md$/);
  assert.match(developerArchitectureHandoffMarkdown({ ...draft, acceptedAt: now }), /Architect \/ Tech Lead handoff/);
  assert.match(developerArchitectureHandoffMarkdown({ ...draft, acceptedAt: now }), /advisory decision evidence/i);
});

test('Developer/Architect puts bounded repository evidence before delivery intake', () => {
  const panel = readFileSync(new URL('../src/components/personas/DeveloperArchitectPanel.tsx', import.meta.url), 'utf8');
  assert.match(panel, /Start with repository evidence/);
  assert.match(panel, /Connect target repository/);
  assert.match(panel, /featureHandoffContinuation/);
  assert.match(panel, /Product definition is already complete/);
  assert.match(panel, /if \(!repositoryConnected\) return/);
  assert.match(panel, /if \(!feature\) return <PersonaScopeChooser/);
  const workspaceView = readFileSync(new URL('../src/app/WorkspaceView.tsx', import.meta.url), 'utf8');
  assert.match(workspaceView, /personaRoute === 'developer' \? onImportPersonaFeature\('developer', 'feature'\)/);
  assert.match(workspaceView, /onContinueImportedHandoff/);
});

test('technical ownership has an explicit Architect handoff without changing the durable developer persona', () => {
  assert.equal(technicalRoleForFeature(undefined), 'combined');
  assert.equal(technicalRoleDefinition('architect').label, 'Architect / Tech Lead');
  assert.match(technicalRoleDefinition('architect').responsibility, /Stage 4/);
  assert.match(technicalRoleDefinition('developer').responsibility, /Stage 5/);
  const selector = readFileSync(new URL('../src/components/personas/TechnicalRoleSelector.tsx', import.meta.url), 'utf8');
  assert.match(selector, /Technical ownership/);
  assert.match(selector, /technicalRoleDefinitions/);
  const panel = readFileSync(new URL('../src/components/personas/DeveloperArchitectPanel.tsx', import.meta.url), 'utf8');
  assert.match(panel, /Architect stop point: approve the architecture plan/);
  const stage = readFileSync(new URL('../src/components/personas/PersonaHandoffStage.tsx', import.meta.url), 'utf8');
  assert.match(stage, /Done with architecture work/);
  assert.match(stage, /Start as receiving Developer — Stage 5/);
  assert.match(stage, /Continue as Architect \+ Developer/);
  const workspace = readFileSync(new URL('../src/components/personas/PersonaWorkspace.tsx', import.meta.url), 'utf8');
  assert.match(workspace, /onSaveTechnicalRole\(feature\.id, 'developer'\)/);
  assert.match(workspace, /onSaveTechnicalRole\(feature\.id, 'combined'\)/);
});

test('Journey renders historical persona evidence only where it informs the active decision', () => {
  assert.equal(isStageContextRelevant('persona-inputs', 4), true);
  assert.equal(isStageContextRelevant('persona-inputs', 7), false);
  const journey = readFileSync(new URL('../src/components/journey/FeatureJourney.tsx', import.meta.url), 'utf8');
  assert.match(journey, /JourneyPersonaContext/);
  assert.match(journey, /isStageContextRelevant/);
  assert.doesNotMatch(journey, /<ProductManagerPanel/);
  const context = readFileSync(new URL('../src/components/journey/JourneyPersonaContext.tsx', import.meta.url), 'utf8');
  assert.match(context, /Accepted inputs informing this stage/);
  assert.match(context, /read-only context/);
});

test('delivery intake never lets a later agent scan overwrite an explicit agent choice', () => {
  const intake = readFileSync(new URL('../src/components/import/FeatureImportModal.tsx', import.meta.url), 'utf8');
  assert.match(intake, /const agentChoiceIsExplicit = useRef\(false\)/);
  assert.match(intake, /detected && !agentChoiceIsExplicit\.current/);
  assert.match(intake, /agentChoiceIsExplicit\.current = true; setEngineAgent\(agent\)/);
});

test('Business Analyst and Security Researcher packages remain reviewable advisory evidence', () => {
  const business = createBusinessAnalysisDraft('Tenant summary', 'Leaders need a concise view.', 'feature', 'studio/tenant-summary/business-analysis.md', now);
  const security = createSecurityResearchDraft('Tenant summary', 'feature', 'studio/tenant-summary/security-research.md', now);
  assert.equal(businessAnalysisIssue(business), undefined);
  assert.equal(securityResearchIssue(security), undefined);
  assert.equal(personaArtifactAdapter('business-analyst')?.artifactLabel, 'Business analysis package');
  assert.equal(personaArtifactAdapter('security-researcher')?.artifactLabel, 'Security research package');
  assert.match(business.markdown, /Acceptance evidence/);
  assert.match(security.markdown, /Required controls/);
});

test('persona projections pass the GitHub Spec Kit contract before acceptance', () => {
  const feature = createFeatureInboxItem({ title: 'Tenant summary', userStories: [], functionalRequirements: [], tasks: [] }, 'text', 0, now);
  const basePath = `studio/${feature.slug}`;
  const product = createProductOutcomeDraft(feature.title, feature.summary, `${basePath}/product-brief.md`, now);
  const business = createBusinessAnalysisDraft(feature.title, feature.summary, 'feature', `${basePath}/business-analysis.md`, now);
  const architecture = createDeveloperArchitectureDraft(feature.title, feature.summary, 'feature', [], `${basePath}/technical-decision.md`, now);
  const security = createSecurityResearchDraft(feature.title, 'feature', `${basePath}/security-research.md`, now);
  for (const projection of [product.specKitProjection, business.specKitProjection, architecture.specKitProjection, security.specKitProjection]) {
    assert.equal(engineProjectionIssue(createProjectWorkspace('Example', 'Example project'), feature, projection), undefined);
  }
});

test('accepted persona artifacts are consumed only through the declared handoff matrix', () => {
  const feature = createFeatureInboxItem({ title: 'Tenant summary', userStories: [], functionalRequirements: [], tasks: [] }, 'text', 0, now);
  const root = `studio/${feature.slug}`;
  feature.productOutcome = { ...createProductOutcomeDraft(feature.title, feature.summary, `${root}/product-brief.md`, now), acceptedAt: now };
  feature.businessAnalysis = { ...createBusinessAnalysisDraft(feature.title, feature.summary, 'feature', `${root}/business-analysis.md`, now), acceptedAt: now };
  feature.securityResearch = { ...createSecurityResearchDraft(feature.title, 'feature', `${root}/security-research.md`, now), acceptedAt: now };
  assert.deepEqual(availablePersonaInputs(feature, 'developer').map((input) => input.source), ['product-manager', 'business-analyst', 'security-researcher']);
  assert.deepEqual(availablePersonaInputs(feature, 'business-analyst').map((input) => input.source), ['product-manager']);
  const packet = personaConsumptionPacket(feature, 'engine');
  assert.match(packet, /Reviewed Product Manager input/);
  assert.match(packet, /Reviewed Business Analyst input/);
  assert.match(packet, /Reviewed Security Researcher input/);
  assert.doesNotMatch(packet, /technical decision package/i);
});

test('every persona completes through the same policy-driven handoff stage', () => {
  for (const persona of personaDefinitions) {
    const definition = personaHandoffDefinition(persona.id);
    assert.ok(definition.artifactLabel);
    assert.ok(definition.title);
    assert.ok(definition.contents.length);
    assert.ok(definition.continueLabel);
    assert.ok(personaHandoffRecipients(persona.id).length);
    assert.match(personaHandoffRecipientText(persona.id), /accepted input/i);
  }
  const stage = readFileSync(new URL('../src/components/personas/PersonaHandoffStage.tsx', import.meta.url), 'utf8');
  assert.match(stage, /acceptedPersonaArtifact/);
  assert.match(stage, /<PersonaDeliveryObservability feature=\{feature\} personaId=\{personaId\}/);
  assert.match(stage, /onFinish=\{onComplete\}/);
  assert.match(stage, /personaHandoffRecipientText/);
  assert.match(stage, /selectedEngineContract/);
  assert.match(stage, /personaHandoffPolicy/);
  assert.match(stage, /sddEngineRoleHandoff/);
  assert.match(stage, /onDownloadEngineArtifact/);
  const card = readFileSync(new URL('../src/components/personas/PersonaHandoffCard.tsx', import.meta.url), 'utf8');
  assert.match(card, /PersonaHandoffDeliverables/);
  assert.match(card, /Back to Home/);
  assert.match(card, /Engine artifact/);
  assert.match(card, /complete engine package additionally requires accepted spec\.md, plan\.md, and tasks\.md/);
  assert.match(card, /Download canonical/);
  assert.match(card, /Download handoff \(\.zip\)/);
  assert.match(card, /Recommended next step/);
  assert.match(card, /Your work is complete/);
  assert.match(card, /Optional continuation/);
  assert.match(card, /Download or inspect files/);
  assert.match(card, /ArchiveTree/);
  const deliverables = readFileSync(new URL('../src/components/personas/PersonaHandoffDeliverables.tsx', import.meta.url), 'utf8');
  assert.match(deliverables, /What will be delivered/);
  assert.match(deliverables, /deliverables\.map/);
  assert.match(stage, /User stories \(\$\{stories\.length\}\)/);
  assert.match(stage, /Requirements \(\$\{requirements\.length\}\)/);
  assert.match(stage, /personaHandoffArchivePaths/);
  const workspace = readFileSync(new URL('../src/components/personas/PersonaWorkspace.tsx', import.meta.url), 'utf8');
  assert.equal((workspace.match(/<PersonaHandoffStage/g) || []).length, 1);
  assert.equal((workspace.match(/<PersonaHandoffEntry/g) || []).length, 1);
  assert.match(workspace, /PersonaRouteFrame/);
  assert.match(workspace, /PersonaHandoffImport/);
  assert.match(workspace, /const handoff = personaHandoffPolicy\(feature, personaId\)/);
  assert.match(workspace, /if \(handoff\) return frame\(null, false, true\)/);
});

test('a portable persona handoff restores an accepted engine projection without repository content', async () => {
  const project = createProjectWorkspace('Tenant workspace', 'Tenant summary delivery');
  const feature = createFeatureInboxItem({ title: 'Tenant summary', summary: 'Leaders need one concise view.', userStories: [], functionalRequirements: [], tasks: [] }, 'text', 0, now);
  const product = createProductOutcomeDraft(feature.title, feature.summary, `studio/${feature.slug}/product-brief.md`, now);
  feature.productOutcome = { ...product, acceptedAt: now };
  const archive = await createPersonaHandoffArchive(project, feature, 'product-manager');
  const handoff = await readPersonaHandoff(new File([archive], 'product-handoff.zip', { type: 'application/zip' }));
  assert.equal(handoff.packageType, 'studio-persona-handoff');
  assert.equal(handoff.artifact.personaId, 'product-manager');
  assert.equal(handoff.artifact.specKitProjection.path, product.specKitProjection.path);
  assert.equal(handoffArtifactPayload(handoff).acceptedAt, now);
  assert.doesNotMatch(JSON.stringify(handoff), /repositoryPath|pairingToken|authorization/i);
});

test('accepted persona handoffs use one policy to contribute only proven work and resume at the first safe stage', () => {
  const product = createProductOutcomeDraft('Tenant summary', 'Leaders need a concise view.', 'studio/tenant-summary/product-brief.md', now);
  const analysis = createBusinessAnalysisDraft('Tenant summary', 'Leaders need a concise view.', 'feature', 'studio/tenant-summary/business-analysis.md', now);
  const technical = createDeveloperArchitectureDraft('Tenant summary', 'Leaders need a concise view.', 'feature', [], 'studio/tenant-summary/technical-decision.md', now);
  const security = createSecurityResearchDraft('Tenant summary', 'feature', 'studio/tenant-summary/security-research.md', now);

  assert.deepEqual(personaHandoffContinuation('product-manager', product).creditedStages, [2]);
  assert.deepEqual(personaHandoffContinuation('business-analyst', analysis).creditedStages, [2]);
  assert.deepEqual(personaHandoffContinuation('developer', technical).creditedStages, []);
  assert.deepEqual(personaHandoffContinuation('security-researcher', security).creditedStages, []);

  const intake = personaHandoffIntake('product-manager', product, [], []);
  assert.equal(intake.userStories.length, 1);
  assert.equal(intake.functionalRequirements.length, 1);
  assert.equal(intake.userStories[0].requirementIds?.[0], intake.functionalRequirements[0].id);

  const beforeBaseline = continueJourneyFromHandoff(createFeatureJourney(now), personaHandoffContinuation('product-manager', product), featureJourneyStages.map((stage) => stage.id), now);
  assert.deepEqual(beforeBaseline.completedStages, [2]);
  assert.equal(beforeBaseline.activeStage, 1);
  const afterBaseline = continueJourneyFromHandoff({ ...beforeBaseline, completedStages: [1, 2] }, personaHandoffContinuation('product-manager', product), featureJourneyStages.map((stage) => stage.id), now);
  assert.equal(afterBaseline.activeStage, 3);

  const resumed = completeJourneyPrerequisite(beforeBaseline, 1, now);
  assert.deepEqual(resumed.completedStages, [1, 2]);
  assert.equal(resumed.activeStage, 3);

  const feature = createFeatureInboxItem({ title: 'Tenant summary', userStories: [], functionalRequirements: [], tasks: [] }, 'text', 0, now);
  feature.productOutcome = { ...product, acceptedAt: now };
  assert.equal(featureHandoffContinuation(feature)?.nextEngineeringStage, 3);

  const reviewedDelivery = createFeatureInboxItem({ title: 'Reviewed tenant summary', userStories: [], functionalRequirements: [], tasks: [] }, 'file', 0, now);
  reviewedDelivery.productManagerDecision = { personaId: 'product-manager', status: 'accepted', recordedAt: now };
  reviewedDelivery.specification = { path: `specs/${reviewedDelivery.slug}/spec.md`, content: '# Feature Specification:\n\nReviewed scope.', acceptedAt: now };
  assert.deepEqual(featureHandoffContinuation(reviewedDelivery)?.creditedStages, [2]);
  assert.equal(featureHandoffContinuation(reviewedDelivery)?.nextEngineeringStage, 3);
});

test('accepted Architect ZIP resumes a receiving Developer at Stage 5 after repository baseline', async () => {
  const project = createProjectWorkspace('Architecture workspace', 'Stage 5 continuation');
  const feature = createFeatureInboxItem({ title: 'Tenant summary', summary: 'Deliver the reviewed design.', userStories: [], functionalRequirements: [], tasks: [] }, 'text', 0, now);
  feature.technicalRole = 'architect';
  feature.developerArchitecture = { ...createDeveloperArchitectureDraft(feature.title, feature.summary, 'feature', [], `studio/${feature.slug}/technical-decision.md`, now), acceptedAt: now };
  feature.specification = { path: `specs/${feature.slug}/spec.md`, content: '# Specification\n\nReviewed scope.', acceptedAt: now };
  feature.impactMap = { content: '# Impact map\n\nReviewed repository impact.', acceptedAt: now };
  feature.architecturePlan = { path: `specs/${feature.slug}/plan.md`, content: '# Plan\n\nApproved architecture.', acceptedAt: now };
  project.featureInbox = [feature];
  project.journey = { ...createFeatureJourney(now), featureId: feature.id, completedStages: [1, 2, 3, 4], activeStage: 5 };

  const archive = await createPersonaHandoffArchive(project, feature, 'developer');
  const zip = await JSZip.loadAsync(await archive.arrayBuffer());
  const manifest = JSON.parse(await zip.file('studio-persona-handoff.json')!.async('string'));
  for (const file of [manifest.artifact, manifest.artifact.specKitProjection, ...(manifest.supportingFiles || [])]) {
    assert.ok(zip.file(file.path), `missing declared evidence ${file.path}`);
    assert.equal(await zip.file(file.path)!.async('string'), file.content ?? file.markdown, `${file.path} must match its manifest`);
  }
  const handoff = await readPersonaHandoff(new File([archive], 'architecture-handoff.zip', { type: 'application/zip' }));
  assert.deepEqual(handoff.continuation?.creditedStages, [2, 3, 4]);
  const continuation = personaHandoffContinuation('developer', handoffArtifactPayload(handoff), handoff.continuation);
  const imported = continueJourneyFromHandoff(createFeatureJourney(now), continuation, featureJourneyStages.map((stage) => stage.id), now);
  assert.deepEqual(imported.completedStages, [2, 3, 4]);
  assert.equal(imported.activeStage, 1);
  const baselined = completeJourneyPrerequisite(imported, 1, now);
  assert.deepEqual(baselined.completedStages, [1, 2, 3, 4]);
  assert.equal(baselined.activeStage, 5);

  zip.remove('evidence/accepted-architecture-plan.md');
  const tampered = await zip.generateAsync({ type: 'blob' });
  await assert.rejects(
    readPersonaHandoff(new File([tampered], 'tampered-architecture-handoff.zip', { type: 'application/zip' })),
    /evidence\/accepted-architecture-plan\.md is missing/,
  );
});

test('Product Manager can choose the canonical Spec-Kit intake before its focused persona route', () => {
  const panelRegistry = readFileSync(new URL('../src/components/personas/personaPanelRegistry.tsx', import.meta.url), 'utf8');
  const start = readFileSync(new URL('../src/components/personas/ProductManagerStart.tsx', import.meta.url), 'utf8');
  const intake = readFileSync(new URL('../src/components/import/FeatureImportModal.tsx', import.meta.url), 'utf8');
  assert.match(start, /Import an existing feature/);
  assert.match(panelRegistry, /onImportFeature\(personaId\)/);
  assert.match(panelRegistry, /personaPanelRegistry/);
  assert.match(intake, /personaRoute\?: PersonaId/);
  assert.match(intake, /personaRoute\);/);
});

test('every saved persona route is restored after refresh instead of falling back to generic setup', () => {
  const shell = readFileSync(new URL('../src/app/useStudioShell.ts', import.meta.url), 'utf8');
  const context = readFileSync(new URL('../src/lib/personas/context.ts', import.meta.url), 'utf8');
  assert.match(shell, /resumablePersonaRoute\(activeProject\)/);
  assert.match(shell, /setPersonaRoute\(persistedPersona\)/);
  assert.match(shell, /if \(persistedPersona\) setActiveTab\('personas'\)/);
  assert.match(context, /activeDeliveryItemForProject/);
  for (const persona of personaDefinitions) {
    const feature = createFeatureInboxItem({ title: `${persona.label} feature`, summary: 'Resume after refresh.', userStories: [], functionalRequirements: [], tasks: [] }, 'text', 0, now);
    feature.personaRoute = persona.id;
    const project = createProjectWorkspace('Resume test', 'Persona route persistence');
    project.featureInbox = [feature];
    project.journey = { ...project.journey!, featureId: feature.id };
    assert.equal(resumablePersonaRoute(project), persona.id);
  }
});

test('an active shared journey never resumes the sending persona as current work', () => {
  const feature = createFeatureInboxItem({ title: 'Shared journey feature', summary: 'Continue delivery.', userStories: [], functionalRequirements: [], tasks: [] }, 'text', 0, now);
  feature.personaRoute = 'product-manager';
  const project = createProjectWorkspace('Shared journey test', 'Role boundary');
  project.featureInbox = [feature];
  project.journey = { ...project.journey!, featureId: feature.id, activeStage: 7, completedStages: [1, 2, 3, 4, 5, 6], activePersona: 'developer' };
  assert.equal(isSharedFeatureJourneyActive(project.journey), true);
  assert.equal(resolveWorkingPersona(undefined, project.journey), sharedFeatureJourneyRule.defaultWorkingPersona);
  assert.equal(shouldShowPersonaHandoffNavigation(true, project.journey), false);
  assert.equal(resumablePersonaRoute(project), undefined);
});

test('the persisted active role takes precedence over the recovery fallback', () => {
  const journey = { featureId: 'security-feature', activeStage: 4, completedStages: [1, 2, 3], activePersona: 'security-researcher' as const, startedAt: now, updatedAt: now };
  assert.equal(resolveWorkingPersona(undefined, journey), 'security-researcher');
});

test('structured Product Manager intake opens a review-and-handoff step before the shared Journey', () => {
  const shell = readFileSync(new URL('../src/app/useStudioShell.ts', import.meta.url), 'utf8');
  const panel = readFileSync(new URL('../src/components/personas/ProductManagerPanel.tsx', import.meta.url), 'utf8');
  const handoff = readFileSync(new URL('../src/components/personas/PersonaHandoffImport.tsx', import.meta.url), 'utf8');
  assert.match(shell, /const sharedJourneyActive = isSharedFeatureJourneyActive\(activeProject\.journey\)/);
  assert.match(shell, /sharedJourneyActive \? activeProject\.journey\?\.activePersona/);
  assert.match(shell, /if \(sharedJourneyActive\) setActiveTab\('journey'\)/);
  assert.match(shell, /if \(persistedPersona\) setActiveTab\('personas'\)/);
  assert.match(shell, /if \(saved\) setActiveTab\(route \? 'personas' : 'journey'\)/);
  assert.match(shell, /setActiveTab\('journey'\)/);
  assert.match(panel, /Review this delivery before preparing its handoff/);
  assert.match(panel, /Review and edit delivery package/);
  assert.match(panel, /Prepare reviewed-delivery handoff/);
  assert.match(panel, /Add a Product Brief before continuing \(optional\)/);
  assert.doesNotMatch(panel, /Skip product discovery for this feature/);
  assert.match(handoff, /Resume a previously exported Studio handoff/);
  assert.match(handoff, /<details/);
});

test('the reusable delivery marker keeps the active role separate from handoff provenance', () => {
  const workspace = readFileSync(new URL('../src/app/WorkspaceView.tsx', import.meta.url), 'utf8');
  const marker = readFileSync(new URL('../src/components/common/DeliveryPersonaMarker.tsx', import.meta.url), 'utf8');
  assert.match(workspace, /<DeliveryPersonaMarker project=\{project\} activePersona=\{personaRoute\} onOpenPersona=\{onStartPersona\}/);
  assert.match(marker, /Working as:/);
  assert.match(marker, /Handoff context from/);
  assert.match(marker, /Open \{persona\.label\} workspace/);
  assert.match(marker, /activeFeatureForProject/);
  assert.match(marker, /personaCatalogEntry/);
});

test('an active Journey stage takes priority over every persona editor', () => {
  const workspace = readFileSync(new URL('../src/components/personas/PersonaWorkspace.tsx', import.meta.url), 'utf8');
  const shell = readFileSync(new URL('../src/app/useStudioShell.ts', import.meta.url), 'utf8');
  assert.match(workspace, /ActiveJourneyPriority/);
  assert.match(workspace, /project\.journey\?\.featureId === feature\.id/);
  assert.match(workspace, /if \(journeyTakesPriority\) onNavigate\('journey'\)/);
  assert.match(workspace, /onNavigate\(journeyStage\.destination\)/);
  assert.match(shell, /const startPersonaRoute/);
  assert.match(shell, /stage && stage\.id >= 6/);
});

test('Product Manager intake has a local Spec-Kit-shaped fallback when cloud AI is unavailable', () => {
  const draft = localProductSpecDraft('Tenant health summary', 'Leaders need a concise tenant health view.');
  assert.equal(draft.userStories?.[0].id, 'US-001');
  assert.equal(draft.functionalRequirements?.[0].id, 'FR-001');
  assert.match(draft.summary || '', /tenant health/i);
});

test('Product Manager intake keeps the connector-agent route available alongside the local draft', () => {
  const intake = readFileSync(new URL('../src/components/import/FeatureImportModal.tsx', import.meta.url), 'utf8');
  assert.match(intake, /Product Manager intake — local draft or connector agent/);
  assert.match(intake, /Choose preparation method/);
  assert.match(intake, /const handlePrimaryAction = \(\) => generationPath === 'gemini'/);
  assert.match(intake, /Use the connector agent instead/);
  assert.match(intake, /Use a connector agent instead/);
  assert.match(intake, /setGenerationPath\(recommended \? 'engine' : isProductManagerIntake \? 'gemini' : 'engine'\)/);
  assert.match(intake, /setGenerationPath\('engine'\)/);
});

test('Product Manager agent enrichment is explicit, optional, and read-only', () => {
  const panel = readFileSync(new URL('../src/components/personas/ProductManagerPanel.tsx', import.meta.url), 'utf8');
  const agentOption = readFileSync(new URL('../src/components/personas/PersonaAgentOption.tsx', import.meta.url), 'utf8');
  assert.match(panel, /PersonaAgentOption/);
  assert.match(agentOption, /Use an agent from Studio/);
  assert.match(agentOption, /runs read-only/);
  assert.match(panel, /No repository, clone, development tools, or test run is required/);
  assert.match(panel, /preparePersonaDraft/);
  assert.match(panel, /Start Product Brief/);
  assert.match(panel, /enrichWithAgent/);
});
