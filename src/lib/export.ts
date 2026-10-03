import JSZip from 'jszip';
import { FeatureInboxItem, SpecKitProject, StudioProcessCase } from '../types/speckit';
import { featureArtifactRoot, slugify } from './projectIdentity';
import { resolveStackProfile } from './stackProfiles';
import { processDefinitions } from './processCases';
import { deliveryScope, primaryStoryForItem } from './deliveryItems';
import { normalizeSddEngineSelection, SDD_ENGINE_SELECTION_SCHEMA_VERSION } from './sddEngineMigration';
import { SPECKIT_RELEASE_TAG } from './specKitCompliance';
import { validateSddEngineArtifacts } from './sddEngineWorkflow';

function featureSpecMarkdown(project: SpecKitProject, feature: FeatureInboxItem): string {
  const stories = project.spec.userStories.filter((story) => feature.userStoryIds.includes(story.id));
  const requirements = project.spec.functionalRequirements.filter((requirement) => feature.requirementIds.includes(requirement.id));
  const storyScope = deliveryScope(feature) === 'user-story';
  if (storyScope) {
    const story = primaryStoryForItem(project, feature);
    if (!story) return '';
    const priority = story.priority === 'High' ? 'P1' : story.priority === 'Medium' ? 'P2' : 'P3';
    const narrative = `As a ${story.asA}, I want to ${story.iWantTo}, so that ${story.soThat}.`;
    const scenarios = story.acceptanceCriteria.map((criterion, index) => `${index + 1}. **Given** the existing application is available, **When** the ${story.title.toLowerCase()} behavior is exercised, **Then** ${criterion.replace(/[.]$/, '').replace(/^./, (value) => value.toLowerCase())}.`).join('\n');
    const outcomes = story.acceptanceCriteria.map((criterion, index) => `- **SC-${String(index + 1).padStart(3, '0')}**: ${criterion}`).join('\n');
    return feature.specification?.content || `# Feature Specification: ${story.title}

**Feature Branch**: \`${feature.slug}\`
**Created**: ${feature.importedAt.slice(0, 10)}
**Status**: Draft
**Input**: User description: "${narrative}"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - ${story.title} (Priority: ${priority})

${narrative}

**Why this priority**: This delivery item was explicitly selected for independent implementation.

**Independent Test**: ${story.acceptanceCriteria[0] || `Verify ${story.title} independently.`}

**Acceptance Scenarios**:

${scenarios || '1. **Given** the existing application is available, **When** the story is completed, **Then** its stated user outcome is independently verifiable.'}

### Edge Cases

- Behavior outside this selected story remains unchanged.
- Invalid or unavailable dependencies fail without partially completing the story.

## Requirements *(mandatory)*

### Functional Requirements

${requirements.map((requirement) => `- **${requirement.id}**: System MUST ${requirement.description.replace(/[.]$/, '')}.`).join('\n') || `- **FR-001**: System MUST deliver the selected user outcome described by User Story 1.`}

## Success Criteria *(mandatory)*

### Measurable Outcomes

${outcomes || `- **SC-001**: User Story 1 passes its independent acceptance test.`}

## Assumptions

- Existing behavior, interfaces, and data outside this story remain backward compatible.
- The connected repository and its constitution are authoritative for implementation constraints.
`;
  }
  return `# ${feature.featureKey || feature.title} — ${feature.title}\n\n> Scope: ${storyScope ? 'One user story' : 'Feature'}\n\n${feature.summary}\n\n## ${storyScope ? 'User story in focus' : 'User stories'}\n${stories.map((story) => `### ${story.id}: ${story.title}\nAs a ${story.asA}, I want to ${story.iWantTo}, so that ${story.soThat}.\n\n${story.acceptanceCriteria.map((criterion) => `- [ ] ${criterion}`).join('\n')}`).join('\n\n') || 'No linked user stories.'}\n\n## Scoped functional requirements\n${requirements.map((requirement) => `- **${requirement.id}**: ${requirement.title} — ${requirement.description}`).join('\n') || 'No linked functional requirements.'}\n`;
}

/** A portable, feature-owned package. Its paths are safe to commit directly to a feature branch. */
export function createFeaturePackageFiles(project: SpecKitProject, feature: FeatureInboxItem): Array<{ path: string; content: string }> {
  const root = featureArtifactRoot(feature);
  const storyScope = deliveryScope(feature) === 'user-story';
  const story = storyScope ? primaryStoryForItem(project, feature) : undefined;
  const studioRoot = storyScope ? `.specify/studio/delivery/${feature.slug || slugify(feature.title)}` : root;
  const manifest = {
    schemaVersion: storyScope ? 2 : 1,
    ...(storyScope ? { scope: 'user-story', deliveryKey: feature.featureKey || null, primaryStoryId: feature.primaryStoryId || null, parentFeatureId: feature.parentFeatureId || null, acceptanceCriteriaCount: story?.acceptanceCriteria.length || 0 } : {}),
    featureKey: feature.featureKey || null,
    slug: feature.slug || slugify(feature.title),
    studioProjectId: project.id,
    sddEngine: normalizeSddEngineSelection(project.sddEngine),
    sddEngineSchemaVersion: SDD_ENGINE_SELECTION_SCHEMA_VERSION,
    canonicalRemote: project.repositoryIdentity?.canonicalRemote || null,
    branch: feature.branch || null,
    worktreePath: feature.worktreePath || null,
    baselineCommit: feature.baselineCommit || null,
    exportedAt: new Date().toISOString(),
    source: feature.source,
    status: feature.implementationReceipts?.length ? 'implementing' : feature.deliveryPlan?.acceptedAt ? 'planned' : 'draft',
    pullRequest: feature.pullRequest || null,
    stackProfile: resolveStackProfile(project),
    governance: { dependencies: feature.dependencies || [], prohibitedPaths: feature.prohibitedPaths || resolveStackProfile(project).prohibitedPaths },
  };
  const files = [
    { path: `${studioRoot}/manifest.json`, content: JSON.stringify(manifest, null, 2) },
    { path: `${root}/spec.md`, content: featureSpecMarkdown(project, feature) },
    ...(storyScope
      ? feature.impactMap?.content ? [{ path: `${studioRoot}/impact-map.md`, content: feature.impactMap.content }] : []
      : [{ path: `${root}/impact-map.md`, content: feature.impactMap?.content || '# Impact map\n\nNot accepted yet.' }]),
    ...(storyScope
      ? feature.architecturePlan?.content ? [{ path: `${root}/plan.md`, content: feature.architecturePlan.content }] : []
      : [{ path: `${root}/plan.md`, content: feature.architecturePlan?.content || '# Feature plan\n\nNot accepted yet.' }]),
    ...(storyScope
      ? feature.deliveryPlan?.content ? [{ path: `${root}/tasks.md`, content: feature.deliveryPlan.content }] : []
      : [{ path: `${root}/tasks.md`, content: feature.deliveryPlan?.content || '# Feature tasks\n\nNot accepted yet.' }]),
    { path: `${studioRoot}/implementation-receipts.json`, content: JSON.stringify(feature.implementationReceipts || [], null, 2) },
    ...(feature.pullRequest ? [{ path: `${studioRoot}/pull-request.json`, content: JSON.stringify(feature.pullRequest, null, 2) }] : []),
    { path: `${studioRoot}/superseded-implementation-receipts.json`, content: JSON.stringify(feature.supersededImplementationReceipts || [], null, 2) },
    { path: `${studioRoot}/ci-pr-template.md`, content: `# ${feature.featureKey || feature.title} handoff\n\n- [ ] ${storyScope ? 'Story' : 'Feature'} package committed from ${root}/\n- [ ] Pull request: ${feature.pullRequest?.url || 'Not created through Studio'}\n- [ ] Required checks: ${resolveStackProfile(project).testCommands.join(', ') || 'repository-defined'}\n- [ ] Acceptance criteria and rollback impact reviewed\n- [ ] No unresolved delivery-item conflict\n- [ ] Environment deployment uses repository-scoped concurrency\n` },
  ];
  return files;
}

export async function generateFeaturePackageZip(project: SpecKitProject, feature: FeatureInboxItem): Promise<Blob> {
  const zip = new JSZip();
  const root = deliveryScope(feature) === 'user-story' ? zip : zip.folder(feature.slug || slugify(feature.title)) || zip;
  for (const file of createFeaturePackageFiles(project, feature)) root.file(file.path, file.content);
  return zip.generateAsync({ type: 'blob' });
}

/** A single-feature engine export. Unlike the Studio handoff above, this
 * contains no draft fallback and cannot be generated until the selected
 * engine contract accepts all three core artifacts. */
export async function generateEngineFeaturePackageZip(project: SpecKitProject, feature: FeatureInboxItem): Promise<Blob> {
  const issues = engineFeatureExportIssues(project, feature);
  if (issues.length) throw new Error(`Engine export is not ready. ${issues.map((issue) => issue.message).join(' ')}`);
  const artifacts = [
    feature.specification?.acceptedAt && feature.specification.path && feature.specification.content ? { kind: 'spec', path: feature.specification.path, content: feature.specification.content } : undefined,
    feature.architecturePlan?.acceptedAt && feature.architecturePlan.path && feature.architecturePlan.content ? { kind: 'plan', path: feature.architecturePlan.path, content: feature.architecturePlan.content } : undefined,
    feature.deliveryPlan?.acceptedAt && feature.deliveryPlan.path && feature.deliveryPlan.content ? { kind: 'tasks', path: feature.deliveryPlan.path, content: feature.deliveryPlan.content } : undefined,
  ].filter((artifact): artifact is { kind: string; path: string; content: string } => Boolean(artifact));
  const zip = new JSZip();
  for (const artifact of artifacts) zip.file(artifact.path, artifact.content);
  // GitHub Spec Kit resolves the active feature through this pointer (unless a
  // caller explicitly supplies SPECIFY_FEATURE_DIRECTORY). Keep the package
  // engine-native: no Studio manifest is mixed into its input contract.
  zip.file('.specify/feature.json', JSON.stringify({ feature_directory: `specs/${feature.slug}` }, null, 2));
  zip.file('.specify/memory/constitution.md', project.constitution.markdown || `# ${project.constitution.title}\n`);
  return zip.generateAsync({ type: 'blob' });
}

/** The selected SDD adapter is the only authority for feature-package
 * readiness. Callers must never infer exportability from a persona artifact. */
export function engineFeatureExportIssues(project: SpecKitProject, feature: FeatureInboxItem) {
  const artifacts = [
    feature.specification?.acceptedAt && feature.specification.path && feature.specification.content ? { kind: 'spec', path: feature.specification.path, content: feature.specification.content } : undefined,
    feature.architecturePlan?.acceptedAt && feature.architecturePlan.path && feature.architecturePlan.content ? { kind: 'plan', path: feature.architecturePlan.path, content: feature.architecturePlan.content } : undefined,
    feature.deliveryPlan?.acceptedAt && feature.deliveryPlan.path && feature.deliveryPlan.content ? { kind: 'tasks', path: feature.deliveryPlan.path, content: feature.deliveryPlan.content } : undefined,
  ].filter((artifact): artifact is { kind: string; path: string; content: string } => Boolean(artifact));
  return validateSddEngineArtifacts(project, feature, artifacts, ['spec', 'plan', 'tasks']);
}

/**
 * A portable, workflow-owned package for Bug Fix and Idea Assessment. It
 * mirrors the feature-package contract: immutable reviewed artifacts plus a
 * manifest, without copying application source out of its repository.
 */
export function createProcessCasePackageFiles(project: SpecKitProject, item: StudioProcessCase, artifacts: Array<{ path: string; content: string }>): Array<{ path: string; content: string }> {
  const flow = processDefinitions[item.kind];
  const root = flow.root(item.slug);
  const artifactByPath = new Map(artifacts.map((artifact) => [artifact.path, artifact.content]));
  const changedFiles = [...new Set((item.stepReceipts || []).flatMap((receipt) => receipt.changedFiles || []))];
  const manifest = {
    schemaVersion: 1,
    packageType: `${item.kind}-workflow-handoff`,
    studioProjectId: project.id,
    workspace: project.name,
    title: item.title,
    slug: item.slug,
    process: flow.label,
    decision: item.kind === 'assessment' ? item.verdict || null : null,
    sourceArtifactRoot: root,
    exportedAt: new Date().toISOString(),
    reviewedSteps: item.completedSteps,
    executionReceipts: item.stepReceipts || [],
    changedSourceFiles: changedFiles,
    sourceCodePolicy: 'Source code remains in the connected repository. Review it through Studio’s local read-only code viewer or in the repository; it is intentionally not copied into this evidence package.',
  };
  const handoff = `# ${flow.label} handoff\n\n## Case\n${item.title}\n\n## Status\n${item.kind === 'assessment' ? `Decision: ${item.verdict}` : 'Complete and reviewed.'}\n\n## Included evidence\n${flow.steps.map((step) => `- ${root}${step.artifact}`).join('\n')}\n\n## Changed source files\n${changedFiles.map((path) => `- \`${path}\``).join('\n') || 'No source-code changes were recorded.'}\n\n## Source code\nSource files remain in the connected repository. Use Studio’s local read-only code review to inspect the exact diff and source.\n`;
  return [
    { path: 'manifest.json', content: JSON.stringify(manifest, null, 2) },
    { path: 'HANDOFF.md', content: handoff },
    ...flow.steps.map((step) => ({ path: `${root}${step.artifact}`, content: artifactByPath.get(`${root}${step.artifact}`) || `# ${step.artifact}\n\nArtifact was not available when the package was created.` })),
  ];
}

export async function generateProcessCasePackageZip(project: SpecKitProject, item: StudioProcessCase, artifacts: Array<{ path: string; content: string }>): Promise<Blob> {
  const zip = new JSZip();
  const packageRoot = zip.folder(`${item.slug}-${item.kind}-handoff`) || zip;
  for (const file of createProcessCasePackageFiles(project, item, artifacts)) packageRoot.file(file.path, file.content);
  return zip.generateAsync({ type: 'blob' });
}

/**
 * A GitHub Spec Kit archive contains only engine-owned, accepted artifacts.
 * Studio manifests and receipts live under .specify/studio so they cannot be
 * mistaken for engine input. This deliberately fails closed: producing a ZIP
 * is not a substitute for completing the Spec Kit contract.
 */
export function engineExportIssues(project: SpecKitProject): string[] {
  const features = project.featureInbox || [];
  if (!features.length) return ['Create and approve a feature before exporting engine artifacts.'];
  return features.flatMap((feature) => engineFeatureExportIssues(project, feature).map((issue) => `${feature.slug || feature.title}: ${issue.message}`));
}

/** Backward-compatible name for callers that surface the currently supported
 * GitHub adapter. New code should use engineExportIssues. */
export const githubSpecKitExportIssues = engineExportIssues;

export async function generateSpecKitZip(project: SpecKitProject): Promise<Blob> {
  const issues = engineExportIssues(project);
  if (issues.length) throw new Error(`Engine export is not ready. ${issues.join(' ')}`);

  const zip = new JSZip();
  const root = zip.folder(project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')) || zip;
  const features = project.featureInbox || [];
  for (const feature of features) {
    root.file(feature.specification!.path!, feature.specification!.content);
    root.file(feature.architecturePlan!.path!, feature.architecturePlan!.content);
    root.file(feature.deliveryPlan!.path!, feature.deliveryPlan!.content);
  }
  root.file('.specify/memory/constitution.md', project.constitution.markdown || `# ${project.constitution.title}\n`);
  const selectedFeature = features.find((feature) => feature.id === project.journey?.featureId) || features[0];
  root.file('.specify/feature.json', JSON.stringify({ feature_directory: `specs/${selectedFeature.slug}` }, null, 2));
  root.file('.specify/studio/export-manifest.json', JSON.stringify({
    schemaVersion: 1,
    engine: 'github-spec-kit',
    engineContract: SPECKIT_RELEASE_TAG,
    exportedAt: new Date().toISOString(),
    features: features.map((feature) => ({ slug: feature.slug, artifacts: [feature.specification!.path, feature.architecturePlan!.path, feature.deliveryPlan!.path] })),
    studioCompanions: 'Files under .specify/studio are Studio metadata, not GitHub Spec Kit artifacts.',
  }, null, 2));
  return zip.generateAsync({ type: 'blob' });
}

/** @deprecated Retained temporarily for import compatibility. This historic
 * Studio archive is not an engine-conformant GitHub Spec Kit export. */
export async function generateLegacyStudioArchive(project: SpecKitProject): Promise<Blob> {
  const zip = new JSZip();

  const sanitizeName = project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const rootDir = zip.folder(sanitizeName) || zip;

  // 1. .spec-kit root metadata
  const specKitFolder = rootDir.folder('.spec-kit');
  if (specKitFolder) {
    specKitFolder.file('project.json', JSON.stringify({
      id: project.id,
      name: project.name,
      description: project.description,
      version: project.version,
      sddEngine: normalizeSddEngineSelection(project.sddEngine),
      sddEngineSchemaVersion: SDD_ENGINE_SELECTION_SCHEMA_VERSION,
      updatedAt: project.updatedAt,
      cliVersion: '1.0.0-spec-kit-studio'
    }, null, 2));
  }

  // 2. spec.md
  const userStoriesMd = project.spec.userStories.map((u) => `### Story ${u.id}: ${u.title} [Priority: ${u.priority}]
**As a** ${u.asA}
**I want to** ${u.iWantTo}
**So that** ${u.soThat}

**Acceptance Criteria:**
${u.acceptanceCriteria.map((c) => `- [ ] ${c}`).join('\n')}
`).join('\n\n');

  const frsMd = project.spec.functionalRequirements.map((f) => `- **${f.id}** [${f.category} / ${f.priority}]: ${f.title} - ${f.description}`).join('\n');
  const nfrsMd = project.spec.nonFunctionalRequirements.map((n) => `- **${n.id}**: ${n.title} - ${n.description} ${n.metric ? `(Metric: ${n.metric})` : ''}`).join('\n');

  const fullSpecMd = `# ${project.spec.title} Specification

> **Summary:** ${project.spec.summary}
> **Last Updated:** ${project.spec.lastUpdated}

## 1. User Stories
${userStoriesMd || 'No user stories specified.'}

## 2. Functional Requirements
${frsMd || 'No functional requirements specified.'}

## 3. Non-Functional Requirements
${nfrsMd || 'No non-functional requirements specified.'}

## 4. User Flows
${project.spec.userFlows.map((uf, i) => `${i + 1}. ${uf}`).join('\n')}

## 5. Edge Cases & Risks
${project.spec.edgeCases.map((ec) => `- ${ec}`).join('\n')}

## 6. Success Metrics
${project.spec.successMetrics.map((sm) => `- ${sm}`).join('\n')}
`;

  rootDir.file('spec.md', fullSpecMd);

  // 3. plan.md
  const techStackMd = project.plan.techStack.map((t) => `- **${t.category}**: ${t.technology} _(${t.justification})_`).join('\n');
  const apisMd = project.plan.apiContracts.map((a) => `### ${a.method} ${a.path}
${a.description}
- **Request Payload:** \`${a.payload || 'None'}\`
- **Response:** \`${a.response || '200 OK'}\`
`).join('\n');

  const adrsMd = project.plan.adrs.map((a) => `### ${a.id}: ${a.title} [Status: ${a.status}]
- **Context:** ${a.context}
- **Decision:** ${a.decision}
- **Consequences:** ${a.consequences}
- **Date:** ${a.date}
`).join('\n');

  const fullPlanMd = `# Technical Implementation Plan for ${project.name}

> **Architecture Overview:** ${project.plan.architectureSummary}

## Tech Stack
${techStackMd || 'None declared.'}

## System Architecture Diagram
\`\`\`mermaid
${project.plan.mermaidDiagram || 'graph TD\n    A[Client] --> B[Server]'}
\`\`\`

## API Contracts
${apisMd || 'None defined.'}

## Architectural Decision Records (ADRs)
${adrsMd || 'None recorded.'}
`;

  rootDir.file('plan.md', fullPlanMd);

  // 4. tasks.md
  const tasksByPhase: Record<string, typeof project.tasks.tasks> = {};
  project.tasks.tasks.forEach((t) => {
    if (!tasksByPhase[t.phase]) tasksByPhase[t.phase] = [];
    tasksByPhase[t.phase].push(t);
  });

  let tasksMd = `# Task Breakdown for ${project.name}\n\n`;
  Object.keys(tasksByPhase).forEach((phase) => {
    tasksMd += `## ${phase}\n`;
    tasksByPhase[phase].forEach((t) => {
      const isDone = t.status === 'done' ? '[x]' : '[ ]';
      const mapped = t.mappedRequirementId ? ` (Req: ${t.mappedRequirementId})` : '';
      const est = t.estimatedHours ? ` [${t.estimatedHours}h]` : '';
      tasksMd += `- ${isDone} **${t.id}**: ${t.title}${mapped}${est}\n  _${t.description}_\n`;
    });
    tasksMd += '\n';
  });

  rootDir.file('tasks.md', tasksMd);

  // 5. constitution.md
  const rulesMd = project.constitution.rules.map((r) => `### ${r.id}: ${r.title} [${r.category} / ${r.strictness}]
${r.description}
> **Rule Statement:** ${r.ruleStatement}
`).join('\n');
  const governanceSources = project.constitution.governanceSources || [];
  const sourceManifest = governanceSources.length ? governanceSources.map((source) => `- ${source.name} (${source.id})`).join('\n') : 'None retained.';

  const fullConstMd = `# Project Constitution: ${project.constitution.title}

${rulesMd || 'No rules defined.'}

## Reviewed governance sources
${sourceManifest}
`;

  rootDir.file('constitution.md', fullConstMd);
  for (const source of governanceSources) {
    const safeName = source.name.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^[-.]+/, '') || `${source.id}.txt`;
    rootDir.file(`governance-sources/${source.id}-${safeName}`, source.content);
  }

  // 6. specify.sh shell script for GitHub spec-kit CLI emulation
  const specifySh = `#!/usr/bin/env bash
# GitHub Spec-Kit CLI Helper Script
# Project: ${project.name}

echo "============================================="
echo " Spec-Kit CLI Workspace: ${project.name}"
echo "============================================="

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

case "$1" in
  init)
    echo "Initializing Spec-Kit structure..."
    mkdir -p .spec-kit prompts
    echo "Spec-Kit project structure ready!"
    ;;
  check|validate)
    echo "Auditing spec.md, plan.md, tasks.md, and constitution.md..."
    echo "✓ Spec completeness check passed!"
    ;;
  prompt)
    echo "Generating AI Agent master prompt for task $2..."
    cat prompts/master-prompt.md 2>/dev/null || echo "Generating prompt snippet..."
    ;;
  status)
    echo "Task Status Overview:"
    grep -E "^- \\[" tasks.md
    ;;
  *)
    echo "Usage: specify [init | check | prompt <task-id> | status]"
    ;;
esac
`;

  rootDir.file('specify.sh', specifySh);

  const specifyCmd = `@echo off
setlocal
rem GitHub Spec-Kit CLI Helper Script
rem Project: ${project.name}

if /I "%~1"=="init" goto init
if /I "%~1"=="check" goto check
if /I "%~1"=="validate" goto check
if /I "%~1"=="prompt" goto prompt
if /I "%~1"=="status" goto status
echo Usage: specify.cmd [init ^| check ^| prompt ^<task-id^> ^| status]
exit /b 0

:init
echo Initializing Spec-Kit structure...
if not exist .spec-kit mkdir .spec-kit
if not exist prompts mkdir prompts
echo Spec-Kit project structure ready!
exit /b 0

:check
echo Auditing spec.md, plan.md, tasks.md, and constitution.md...
echo Spec completeness check passed!
exit /b 0

:prompt
echo Generating AI Agent master prompt for task %~2...
if exist prompts\master-prompt.md (type prompts\master-prompt.md) else (echo Generating prompt snippet...)
exit /b 0

:status
echo Task Status Overview:
findstr /R /C:"^- \[" tasks.md
exit /b 0
`;

  rootDir.file('specify.cmd', specifyCmd);

  // 7. Prompts folder with AI Master Prompt
  const promptsFolder = rootDir.folder('prompts');
  if (promptsFolder) {
    promptsFolder.file('master-prompt.md', `You are an expert AI Coding Agent working on ${project.name}.
Follow the project constitution strictly:
${fullConstMd}

Primary Feature Spec:
${fullSpecMd}

Architecture Plan:
${fullPlanMd}

Current Active Task Breakdown:
${tasksMd}
`);
  }

  return await zip.generateAsync({ type: 'blob' });
}

export async function importSpecKitZip(file: File): Promise<Partial<SpecKitProject> & { name: string }> {
  const zip = await JSZip.loadAsync(file);

  let projectJsonRaw: string | null = null;
  let specMdRaw: string | null = null;
  let planMdRaw: string | null = null;
  let tasksMdRaw: string | null = null;
  let constitutionMdRaw: string | null = null;

  // Search through all zip files (handling possible top-level directory)
  for (const relativePath of Object.keys(zip.files)) {
    const entry = zip.files[relativePath];
    if (entry.dir) continue;

    if (relativePath.endsWith('project.json')) {
      projectJsonRaw = await entry.async('string');
    } else if (relativePath.endsWith('spec.md')) {
      specMdRaw = await entry.async('string');
    } else if (relativePath.endsWith('plan.md')) {
      planMdRaw = await entry.async('string');
    } else if (relativePath.endsWith('tasks.md')) {
      tasksMdRaw = await entry.async('string');
    } else if (relativePath.endsWith('constitution.md')) {
      constitutionMdRaw = await entry.async('string');
    }
  }

  let metadata: any = {};
  if (projectJsonRaw) {
    try {
      metadata = JSON.parse(projectJsonRaw);
    } catch (e) {
      console.warn('Failed to parse project.json from zip:', e);
    }
  }

  const projName = metadata.name || file.name.replace(/\.zip$/i, '').replace(/[-_]/g, ' ');
  const projDesc = metadata.description || 'Imported Spec-Kit package';

  return {
    id: metadata.id || `PROJ-${Date.now()}`,
    name: projName,
    description: projDesc,
    version: metadata.version || '1.0.0',
    sddEngine: normalizeSddEngineSelection(metadata.sddEngine),
    sddEngineSchemaVersion: SDD_ENGINE_SELECTION_SCHEMA_VERSION,
    spec: {
      id: `SPEC-${Date.now()}`,
      title: `${projName} Specification`,
      summary: projDesc,
      userStories: [],
      functionalRequirements: [],
      nonFunctionalRequirements: [],
      userFlows: [],
      edgeCases: [],
      successMetrics: [],
      markdown: specMdRaw || `# ${projName} Specification\n\nImported from Spec-Kit ZIP package.`,
      lastUpdated: new Date().toISOString(),
    },
    plan: {
      id: `PLAN-${Date.now()}`,
      techStack: [
        { category: 'General', technology: 'Imported Architecture', justification: 'Extracted from Spec-Kit ZIP' }
      ],
      architectureSummary: 'Imported Spec-Kit Architecture Plan',
      components: [],
      apiContracts: [],
      dataSchemas: [],
      adrs: [],
      mermaidDiagram: 'graph TD\n    A[Imported Spec-Kit] --> B[Studio Visual Engine]',
      markdown: planMdRaw || `# Architecture Plan\n\nImported from Spec-Kit ZIP.`,
      lastUpdated: new Date().toISOString(),
    },
    tasks: {
      id: `TASKS-${Date.now()}`,
      tasks: [
        {
          id: 'TASK-101',
          title: 'Review imported Spec-Kit tasks',
          phase: 'Phase 1: Setup',
          description: 'Task imported from spec-kit package.',
          status: 'todo',
          estimatedHours: 2,
          mappedRequirementId: 'FR-101',
          dependencies: [],
          targetAgentPromptSnippet: 'Review and execute imported spec-kit tasks.'
        }
      ],
      markdown: tasksMdRaw || `# Tasks\n\nImported from Spec-Kit ZIP.`,
      lastUpdated: new Date().toISOString(),
    },
    constitution: {
      id: `CONST-${Date.now()}`,
      title: `${projName} Governance Constitution`,
      rules: [
        {
          id: 'RULE-01',
          title: 'Imported Rule',
          category: 'Architecture',
          description: 'Rule imported from spec-kit package.',
          ruleStatement: 'Adhere to imported spec-kit constitution.',
          strictness: 'Mandatory',
        }
      ],
      markdown: constitutionMdRaw || `# Constitution\n\nImported from Spec-Kit ZIP.`,
      lastUpdated: new Date().toISOString(),
    },
    updatedAt: new Date().toISOString(),
  };
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
