import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createDashboardViewModel } from '../src/lib/dashboard/dashboardViewModel';
import { createFeatureJourney } from '../src/lib/featureJourney';
import { createProjectWorkspace } from '../src/lib/projectFactory';
import { createFeatureInboxItem } from '../src/lib/featureInbox';
import { createProductOutcomeDraft } from '../src/lib/personas/productManagerArtifacts';

test('dashboard gives an unconnected workspace one setup action', () => {
  const project = createProjectWorkspace('Example', 'Example workspace');
  project.importedRepo = undefined;
  project.featureInbox = undefined;

  const model = createDashboardViewModel(project);
  assert.equal(model.dominant, 'onboarding');
  assert.equal(model.nextAction.destination.tab, 'workspace');
  assert.equal(model.nextAction.title, 'Connect a repository');
});

test('dashboard routes a selected delivery item to the authoritative journey', () => {
  const project = createProjectWorkspace('Example', 'Example workspace');
  project.importedRepo = { ...project.importedRepo!, repoUrl: '/workspace/example' };
  project.featureInbox = [{ id: 'feature-1', title: 'Review access', summary: 'Make access reviewable.', source: 'text', importedAt: '2026-01-01', userStoryIds: [], requirementIds: [], taskIds: [] }];
  project.journey = { ...createFeatureJourney(), featureId: 'feature-1', activeStage: 4, completedStages: [1, 2, 3] };

  const model = createDashboardViewModel(project);
  assert.equal(model.dominant, 'next-action');
  assert.equal(model.nextAction.destination.tab, 'journey');
  assert.equal(model.nextAction.title, 'Design safely');
  assert.equal(model.queue[0].id, 'feature-1');
});

test('dashboard returns completed delivery work to its feature-specific handoff', () => {
  const project = createProjectWorkspace('Example', 'Example workspace');
  project.importedRepo = { ...project.importedRepo!, repoUrl: '/workspace/example' };
  project.featureInbox = [{ id: 'feature-1', title: 'Review access', summary: 'Make access reviewable.', source: 'text', importedAt: '2026-01-01', userStoryIds: [], requirementIds: [], taskIds: [] }];
  project.journey = { ...createFeatureJourney(), featureId: 'feature-1', activeStage: 8, completedStages: [1, 2, 3, 4, 5, 6, 7, 8] };

  const model = createDashboardViewModel(project);
  assert.equal(model.dominant, 'completion');
  assert.equal(model.nextAction.destination.tab, 'journey');
  assert.equal(model.nextAction.actionLabel, 'Open feature handoff');
});

test('a completed persona handoff is not presented as an unfinished engineering journey', () => {
  const project = createProjectWorkspace('Example', 'Example workspace');
  const feature = createFeatureInboxItem({ title: 'Review access', summary: 'Make access reviewable.', userStories: [], functionalRequirements: [], tasks: [] }, 'text', 0, '2026-01-01T00:00:00.000Z');
  feature.productOutcome = { ...createProductOutcomeDraft(feature.title, feature.summary, `studio/${feature.slug}/product-brief.md`, '2026-01-01T00:00:00.000Z'), acceptedAt: '2026-01-01T00:00:00.000Z' };
  project.featureInbox = [feature];
  const model = createDashboardViewModel(project, 'product-manager');
  assert.equal(model.personaHandoff?.personaLabel, 'Product Manager');
  assert.equal(model.personaHandoff?.recipientId, 'developer');
  assert.match(model.nextAction.title, /handoff complete/i);
  assert.equal(model.nextAction.destination.tab, 'personas');
});

test('an active shared Feature Journey takes precedence over a retained persona route', () => {
  const project = createProjectWorkspace('Journey precedence', 'Shared delivery has started.');
  project.importedRepo = { ...project.importedRepo!, repoUrl: '/workspace/journey-precedence' };
  const feature = createFeatureInboxItem({ title: 'Tenant summary', userStories: [], functionalRequirements: [], tasks: [] }, 'text', 0, '2026-01-01T00:00:00.000Z');
  feature.productManagerDecision = { personaId: 'product-manager', status: 'accepted', recordedAt: '2026-01-01T00:00:00.000Z' };
  project.featureInbox = [feature];
  project.journey = { ...project.journey!, featureId: feature.id, activeStage: 7, completedStages: [1, 2, 3, 4, 5, 6] };
  const model = createDashboardViewModel(project, 'product-manager');
  assert.equal(model.journeyInProgress, true);
  assert.equal(model.personaHandoff, undefined);
  assert.equal(model.nextAction.destination.tab, 'journey');
});

test('dashboard insights are derived from retained workspace evidence', () => {
  const project = createProjectWorkspace('Example', 'Example workspace');
  project.spec.functionalRequirements = [{ id: 'FR-1', title: 'Review access', description: 'A reviewer can inspect access.', category: 'Core', priority: 'High' }];
  project.tasks.tasks = [{ id: 'T-1', title: 'Implement access review', description: 'Implement it.', phase: 'Phase 2: Core Infrastructure', status: 'todo', estimatedHours: 1, dependencies: [], mappedRequirementId: 'FR-1' }];
  project.audit = { overallScore: 92, completenessScore: 92, clarityScore: 92, testabilityScore: 92, traceabilityScore: 92, summary: 'Reviewable.', gaps: ['Missing glossary'], ambiguities: [], recommendations: [], lastAudited: '2026-01-01' };

  const model = createDashboardViewModel(project);
  assert.deepEqual(model.insights.map((insight) => insight.value), ['1/1', '92%', '0']);
  assert.deepEqual(model.insights.map((insight) => insight.destination.tab), ['tasks', 'audit', 'journey']);
});

test('Dashboard exposes a product-first persona entry instead of making repository setup the only start', () => {
  const entry = readFileSync(new URL('../src/components/dashboard/workspaceHub/PersonaStartCard.tsx', import.meta.url), 'utf8');
  const hub = readFileSync(new URL('../src/components/dashboard/workspaceHub/WorkspaceHub.tsx', import.meta.url), 'utf8');
  assert.match(entry, /What do you need to accomplish/);
  assert.match(entry, /Define a product outcome/);
  assert.match(entry, /Business Analyst/);
  assert.match(entry, /No repository required/);
  assert.match(entry, /Repository required for technical evidence/);
  assert.match(hub, /<PersonaStartCard onStartPersona=\{onStartPersona\}/);
  assert.match(hub, /<PersonaHandoffHomeCard/);
  const handoffHome = readFileSync(new URL('../src/components/dashboard/workspaceHub/PersonaHandoffHomeCard.tsx', import.meta.url), 'utf8');
  assert.match(handoffHome, /Preview receiving role/);
  assert.match(handoffHome, /read-only preview/);
  assert.match(handoffHome, /ReceivingRolePreview/);
  assert.match(handoffHome, /setPreviewOpen\(true\)/);
  assert.doesNotMatch(handoffHome, /onStartRecipient/);
  assert.match(hub, /showEngineeringOverview/);
  assert.match(hub, /!model\.personaHandoff && <DeliveryQueue/);
  assert.match(hub, /model\.activeDelivery \? <NextActionCard/);
  assert.match(hub, /<ActiveDeliveryMap/);
  assert.match(hub, /<WorkspaceReadinessRow/);
});

test('delivery maps share one accessible connected-workflow component', () => {
  const map = readFileSync(new URL('../src/components/common/WorkflowMap.tsx', import.meta.url), 'utf8');
  const deliveryMap = readFileSync(new URL('../src/components/dashboard/workspaceHub/ActiveDeliveryMap.tsx', import.meta.url), 'utf8');
  const workflowMap = readFileSync(new URL('../src/components/common/WorkflowMap.tsx', import.meta.url), 'utf8');
  const styles = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
  assert.match(map, /export function WorkflowMap/);
  assert.match(map, /aria-current=\{current \? 'step' : undefined\}/);
  assert.match(map, /complete \/ current \/ upcoming/);
  assert.match(deliveryMap, /<WorkflowMap/);
  assert.match(deliveryMap, /View completed handoff/);
  assert.match(deliveryMap, /isComplete=\{personaWorkflowComplete\}/);
  assert.match(workflowMap, /isComplete = false/);
  assert.match(workflowMap, /All \$\{steps\.length\} steps complete/);
  assert.match(styles, /\.workflow-map__track::before/);
  assert.match(styles, /\.workflow-map__track::after/);
  assert.match(styles, /\.workflow-map__step--current/);
});

test('the persistent Studio brand is an accessible Home control', () => {
  const header = readFileSync(new URL('../src/components/layout/header/TopUtilityBar.tsx', import.meta.url), 'utf8');
  assert.match(header, /aria-label="Spec-Kit Studio — go to Home"/);
  assert.match(header, /title="Go to Home"/);
  assert.match(header, /onClick=\{\(\) => onSelectTab\('overview'\)\}/);
});

test('desktop navigation can collapse without losing its mounted state or keyboard safety', () => {
  const sidebar = readFileSync(new URL('../src/components/layout/Sidebar.tsx', import.meta.url), 'utf8');
  const header = readFileSync(new URL('../src/components/layout/header/TopUtilityBar.tsx', import.meta.url), 'utf8');
  const settings = readFileSync(new URL('../src/lib/studioSettings.ts', import.meta.url), 'utf8');
  const styles = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
  assert.doesNotMatch(sidebar, /if \(isCollapsed\) return null/);
  assert.match(sidebar, /inert=\{isCollapsed \|\| undefined\}/);
  assert.match(sidebar, /!isCollapsed, 'sidebar-connector-health'/);
  assert.match(header, /aria-controls="studio-sidebar"/);
  assert.match(header, /aria-expanded=\{Boolean\(isSidebarOpen\)\}/);
  assert.match(settings, /sidebarOpen: boolean/);
  assert.match(styles, /\.studio-sidebar--collapsed/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
});

test('fresh workspaces do not imply an Engineering journey before a delivery route is selected', () => {
  const sidebar = readFileSync(new URL('../src/components/layout/Sidebar.tsx', import.meta.url), 'utf8');
  assert.match(sidebar, /const hasSelectedDelivery = Boolean\(project\.journey\?\.featureId \|\| project\.featureInbox\?\.length\)/);
  assert.match(sidebar, /Choose a role to begin a focused workflow/);
  assert.match(sidebar, /A delivery journey appears after that choice/);
});

test('sidebar uses the shared persona handoff state rather than a PM-only or engineering-stage branch', () => {
  const sidebar = readFileSync(new URL('../src/components/layout/Sidebar.tsx', import.meta.url), 'utf8');
  const handoffSidebar = readFileSync(new URL('../src/components/layout/PersonaHandoffSidebar.tsx', import.meta.url), 'utf8');
  assert.match(sidebar, /const handoffPersonaId = resolveDeliveryPersona\(personaFeature, project\.journey\?\.personaRoute\)/);
  assert.match(sidebar, /personaHandoffPolicy\(personaFeature, handoffPersonaId\)/);
  assert.match(sidebar, /shouldShowPersonaHandoffNavigation/);
  assert.match(sidebar, /<PersonaHandoffSidebar/);
  assert.doesNotMatch(sidebar, /personaRoute === 'product-manager'/);
  assert.match(handoffSidebar, /handoff\.nextPersona/);
  assert.match(handoffSidebar, /Feature Journey · delivery started/);
  assert.match(handoffSidebar, /This is now the single active route for this feature/);
  assert.match(handoffSidebar, /completed stages/);
  assert.match(handoffSidebar, /upcoming stages/);
  assert.match(handoffSidebar, /Return to completed handoff/);
  assert.match(handoffSidebar, /All shared-delivery evidence stays with the feature/);
  assert.match(handoffSidebar, /confirmStudioAction/);
  assert.doesNotMatch(handoffSidebar, /personaId === 'product-manager'/);
  assert.match(handoffSidebar, /StudioSidebarNav/);
  assert.doesNotMatch(handoffSidebar, />Dashboard</);
});
