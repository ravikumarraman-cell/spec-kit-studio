import { SpecKitProject } from '../types/speckit';
import { createUniqueId } from './ids';

/** Creates a complete, valid project aggregate without depending on browser storage. */
export function createProjectWorkspace(name: string, description: string, now = new Date().toISOString()): SpecKitProject {
  const unique = createUniqueId('project');
  return {
    id: unique,
    name,
    description,
    createdAt: now,
    updatedAt: now,
    version: '1.0.7',
    spec: {
      id: createUniqueId('spec'),
      title: name,
      summary: description || 'New Specification for feature development.',
      userStories: [], functionalRequirements: [], nonFunctionalRequirements: [], userFlows: [], edgeCases: [], successMetrics: [],
      markdown: `# ${name}\n\n${description}`,
      lastUpdated: now,
    },
    plan: {
      id: createUniqueId('plan'),
      techStack: [
        { category: 'Frontend', technology: 'React + TypeScript', justification: 'Type-safe interactive UI' },
        { category: 'Backend', technology: 'Node.js Express', justification: 'RESTful API Services' },
      ],
      architectureSummary: 'Modular client-server architecture.', components: [], apiContracts: [], dataSchemas: [], adrs: [],
      mermaidDiagram: 'graph TD\n    A[Client UI] --> B[API Server]',
      markdown: `# Implementation Plan for ${name}`,
      lastUpdated: now,
    },
    tasks: {
      id: createUniqueId('tasks'),
      tasks: [{ id: 'TASK-001', title: 'Project Setup & Dependency Installation', phase: 'Phase 1: Setup', description: 'Initialize directory layout and install base dependencies.', status: 'todo', estimatedHours: 2, dependencies: [] }],
      markdown: '# Task List\n- [ ] TASK-001 Project Setup',
      lastUpdated: now,
    },
    constitution: {
      id: createUniqueId('constitution'),
      title: `${name} Constitution`,
      rules: [{ id: 'RULE-1', title: 'Code Quality & Typing', category: 'Coding Standard', description: 'Strict TypeScript typing without explicit any.', ruleStatement: 'All variables and parameters must be explicitly typed.', strictness: 'Mandatory' }],
      markdown: `# Constitution for ${name}`,
      lastUpdated: now,
    },
  };
}
