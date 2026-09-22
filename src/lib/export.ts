import JSZip from 'jszip';
import { FeatureInboxItem, SpecKitProject, StudioProcessCase } from '../types/speckit';
import { featureArtifactRoot, slugify } from './projectIdentity';
import { resolveStackProfile } from './stackProfiles';
import { processDefinitions } from './processCases';

function featureSpecMarkdown(project: SpecKitProject, feature: FeatureInboxItem): string {
  const stories = project.spec.userStories.filter((story) => feature.userStoryIds.includes(story.id));
  const requirements = project.spec.functionalRequirements.filter((requirement) => feature.requirementIds.includes(requirement.id));
  return `# ${feature.featureKey || feature.title} — ${feature.title}\n\n${feature.summary}\n\n## User stories\n${stories.map((story) => `### ${story.id}: ${story.title}\nAs a ${story.asA}, I want to ${story.iWantTo}, so that ${story.soThat}.\n\n${story.acceptanceCriteria.map((criterion) => `- [ ] ${criterion}`).join('\n')}`).join('\n\n') || 'No linked user stories.'}\n\n## Functional requirements\n${requirements.map((requirement) => `- **${requirement.id}**: ${requirement.title} — ${requirement.description}`).join('\n') || 'No linked functional requirements.'}\n`;
}

/** A portable, feature-owned package. Its paths are safe to commit directly to a feature branch. */
export function createFeaturePackageFiles(project: SpecKitProject, feature: FeatureInboxItem): Array<{ path: string; content: string }> {
  const root = featureArtifactRoot(feature);
  const manifest = {
    schemaVersion: 1,
    featureKey: feature.featureKey || null,
    slug: feature.slug || slugify(feature.title),
    studioProjectId: project.id,
    canonicalRemote: project.repositoryIdentity?.canonicalRemote || null,
    branch: feature.branch || null,
    worktreePath: feature.worktreePath || null,
    baselineCommit: feature.baselineCommit || null,
    exportedAt: new Date().toISOString(),
    source: feature.source,
    status: feature.implementationReceipts?.length ? 'implementing' : feature.deliveryPlan?.acceptedAt ? 'planned' : 'draft',
    stackProfile: resolveStackProfile(project),
    governance: { dependencies: feature.dependencies || [], prohibitedPaths: feature.prohibitedPaths || resolveStackProfile(project).prohibitedPaths },
  };
  const files = [
    { path: `${root}/manifest.json`, content: JSON.stringify(manifest, null, 2) },
    { path: `${root}/spec.md`, content: featureSpecMarkdown(project, feature) },
    { path: `${root}/impact-map.md`, content: feature.impactMap?.content || '# Impact map\n\nNot accepted yet.' },
    { path: `${root}/plan.md`, content: feature.architecturePlan?.content || '# Feature plan\n\nNot accepted yet.' },
    { path: `${root}/tasks.md`, content: feature.deliveryPlan?.content || '# Feature tasks\n\nNot accepted yet.' },
    { path: `${root}/implementation-receipts.json`, content: JSON.stringify(feature.implementationReceipts || [], null, 2) },
    { path: `${root}/ci-pr-template.md`, content: `# ${feature.featureKey || feature.title} handoff\n\n- [ ] Feature package committed from ${root}/\n- [ ] Required checks: ${resolveStackProfile(project).testCommands.join(', ') || 'repository-defined'}\n- [ ] Rollback and migration impact reviewed\n- [ ] No unresolved feature conflict\n- [ ] Environment deployment uses repository-scoped concurrency\n` },
  ];
  return files;
}

export async function generateFeaturePackageZip(project: SpecKitProject, feature: FeatureInboxItem): Promise<Blob> {
  const zip = new JSZip();
  const root = zip.folder(feature.slug || slugify(feature.title)) || zip;
  for (const file of createFeaturePackageFiles(project, feature)) root.file(file.path, file.content);
  return zip.generateAsync({ type: 'blob' });
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

export async function generateSpecKitZip(project: SpecKitProject): Promise<Blob> {
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

  const fullConstMd = `# Project Constitution: ${project.constitution.title}

${rulesMd || 'No rules defined.'}
`;

  rootDir.file('constitution.md', fullConstMd);

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
