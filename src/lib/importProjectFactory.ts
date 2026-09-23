import {
  FeatureSpec,
  ImplementationPlan,
  ProjectConstitution,
  SpecKitProject,
  TaskBreakdown,
  TaskItem,
} from '../types/speckit';
import { FeatureExtractionPackage } from './api/imports';
import { createFeatureInboxItem } from './featureInbox';
import { createUniqueId } from './ids';

const defaultTaskPhase: TaskItem['phase'] = 'Phase 1: Setup';

/** Repository evidence that a new, independent feature workspace may safely inherit. */
export type ImportedProjectContext = Pick<SpecKitProject, 'importedRepo' | 'repositoryIdentity' | 'stackProfile'>;

function toTaskPhase(value: string | undefined): TaskItem['phase'] {
  return value === 'Phase 1: Setup' || value === 'Phase 2: Core Infrastructure' || value === 'Phase 3: Integration' || value === 'Phase 4: Polish & Testing'
    ? value
    : defaultTaskPhase;
}

/** Converts a validated feature extraction response into a complete Studio workspace. */
export function createProjectFromFeatureExtraction(
  extraction: FeatureExtractionPackage,
  fallbackTitle: string,
  now = new Date().toISOString(),
  sourceWorkspace?: ImportedProjectContext,
): SpecKitProject {
  const timestamp = Date.parse(now) || Date.now();
  const title = extraction.title || fallbackTitle || 'Imported Feature Spec';
  const summary = extraction.summary || 'Imported feature specification package';

  const spec: FeatureSpec = {
    id: createUniqueId('spec', timestamp),
    title,
    summary,
    userStories: extraction.userStories || [],
    functionalRequirements: extraction.functionalRequirements || [],
    nonFunctionalRequirements: extraction.nonFunctionalRequirements || [],
    userFlows: extraction.userFlows || ['User accesses feature', 'User performs primary action', 'System validates and responds'],
    edgeCases: ['Network latency or timeout', 'Invalid payload inputs', 'Unauthenticated or expired session'],
    successMetrics: ['100% adoption of primary user workflow', '< 200ms API response latency'],
    markdown: `# Feature Specification: ${title}\n\n${summary}`,
    lastUpdated: now,
  };

  const plan: ImplementationPlan = {
    id: createUniqueId('plan', timestamp),
    techStack: extraction.techStack || [
      { category: 'Frontend', technology: 'React 18 + Tailwind CSS', justification: 'Standard UI framework' },
      { category: 'Backend', technology: 'Express + TypeScript', justification: 'Scalable API server' },
    ],
    architectureSummary: `Architecture plan for feature: ${title}`,
    components: [
      { name: 'Feature UI View', purpose: 'Primary user interaction interface', layer: 'Frontend' },
      { name: 'Feature API Controller', purpose: 'Handles REST endpoints and validation', layer: 'Backend' },
    ],
    apiContracts: extraction.apiContracts || [],
    dataSchemas: [],
    adrs: [{
      id: 'ADR-101', title: `Adopt ${title} Architecture`, status: 'Accepted',
      context: `Imported feature requirements for ${title}`,
      decision: 'Implement modular Spec-Driven architecture with strict task mapping.',
      consequences: 'Provides clean maintainability and clear team traceability.', date: now.split('T')[0],
    }],
    mermaidDiagram: extraction.mermaidDiagram || 'graph TD\n    A[Client UI] --> B[API Router]\n    B --> C[Service Layer]',
    markdown: `# Architecture Plan for ${title}`,
    lastUpdated: now,
  };

  const tasks: TaskBreakdown = {
    id: createUniqueId('tasks', timestamp),
    tasks: (extraction.tasks || []).map((task, index) => ({
      id: task.id || `TASK-${100 + index}`, title: task.title || `Task ${index + 1}`,
      phase: toTaskPhase(task.phase), description: task.description || 'Task description', status: 'todo',
      estimatedHours: task.estimatedHours || 3, mappedRequirementId: task.mappedRequirementId || 'FR-101', dependencies: [],
      targetAgentPromptSnippet: task.targetAgentPromptSnippet || `Implement ${task.title || `task ${index + 1}`} for feature ${title}.`,
    })),
    markdown: `# Task Breakdown for ${title}`, lastUpdated: now,
  };

  const constitution: ProjectConstitution = {
    id: createUniqueId('constitution', timestamp), title: `${title} Governance Constitution`,
    rules: (extraction.constitutionRules || []).map((rule, index) => ({
      id: rule.id || `RULE-${index + 1}`, title: rule.title || 'Coding Standard', category: rule.category || 'Architecture',
      description: rule.description || 'Rule description', ruleStatement: rule.ruleStatement || 'Statement', strictness: rule.strictness || 'Mandatory',
    })),
    markdown: `# Constitution for ${title}`, lastUpdated: now,
  };

  const inheritedRepository = sourceWorkspace?.importedRepo
    ? {
      ...sourceWorkspace.importedRepo,
      detectedTechStack: sourceWorkspace.importedRepo.detectedTechStack.map((technology) => ({ ...technology })),
      keyDirectories: [...sourceWorkspace.importedRepo.keyDirectories],
      suggestedNewFeatures: [...sourceWorkspace.importedRepo.suggestedNewFeatures],
    }
    : undefined;

  return {
    id: createUniqueId('project', timestamp), name: title, description: summary, createdAt: now, updatedAt: now,
    spec, plan, tasks, constitution, version: '1.0.7',
    featureInbox: [createFeatureInboxItem({ ...extraction, title, summary }, 'unknown', 0, now)],
    // A separate feature remains a separate Studio workspace, but it belongs
    // to the repository the user was working in. Carry read-only connection
    // evidence forward so Stage 1 does not needlessly start over.
    ...(inheritedRepository ? { importedRepo: inheritedRepository } : {}),
    ...(sourceWorkspace?.repositoryIdentity ? { repositoryIdentity: { ...sourceWorkspace.repositoryIdentity } } : {}),
    ...(sourceWorkspace?.stackProfile ? {
      stackProfile: {
        ...sourceWorkspace.stackProfile,
        testCommands: sourceWorkspace.stackProfile.testCommands ? [...sourceWorkspace.stackProfile.testCommands] : undefined,
        allowedSourceRoots: sourceWorkspace.stackProfile.allowedSourceRoots ? [...sourceWorkspace.stackProfile.allowedSourceRoots] : undefined,
        prohibitedPaths: sourceWorkspace.stackProfile.prohibitedPaths ? [...sourceWorkspace.stackProfile.prohibitedPaths] : undefined,
      },
    } : {}),
  };
}
