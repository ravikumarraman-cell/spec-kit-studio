import { SpecKitProject } from '../types/speckit';
import { WorkspaceFile } from './connector';
import { AgentTarget, portableTaskPrompt } from './portablePrompts';

export function createWorkspaceFiles(project: SpecKitProject): WorkspaceFile[] {
  const requirements = project.spec.functionalRequirements.map((item) => `- **${item.id}** [${item.category}/${item.priority}]: ${item.title}\n  ${item.description}`).join('\n');
  const stories = project.spec.userStories.map((item) => `### ${item.id}: ${item.title}\nAs a ${item.asA}, I want to ${item.iWantTo}, so that ${item.soThat}.\n\nAcceptance criteria:\n${item.acceptanceCriteria.map((criterion) => `- [ ] ${criterion}`).join('\n')}`).join('\n\n');
  const tech = project.plan.techStack.map((item) => `- **${item.category}**: ${item.technology} — ${item.justification}`).join('\n');
  const contracts = project.plan.apiContracts.map((item) => `### ${item.method} ${item.path}\n${item.description}\n- Request: ${item.payload || 'None'}\n- Response: ${item.response || 'Not specified'}`).join('\n\n');
  const tasks = project.tasks.tasks.map((item) => `- [${item.status === 'done' ? 'x' : ' '}] **${item.id}** (${item.mappedRequirementId || 'UNMAPPED'}): ${item.title}\n  ${item.description}`).join('\n');
  const rules = project.constitution.rules.map((item) => `### ${item.id}: ${item.title} [${item.strictness}]\n${item.ruleStatement}`).join('\n\n');
  const files: WorkspaceFile[] = [
    { path: '.specify/studio/project.json', content: JSON.stringify({ studioProjectId: project.id, name: project.name, updatedAt: project.updatedAt, format: 'spec-kit-studio/0.2' }, null, 2) },
    { path: '.specify/studio/spec.md', content: `# ${project.spec.title}\n\n${project.spec.summary}\n\n## User stories\n${stories || 'None'}\n\n## Functional requirements\n${requirements || 'None'}\n\n## Edge cases\n${project.spec.edgeCases.map((item) => `- ${item}`).join('\n') || 'None'}\n` },
    { path: '.specify/studio/plan.md', content: `# Plan: ${project.name}\n\n${project.plan.architectureSummary}\n\n## Technology\n${tech || 'None'}\n\n## API contracts\n${contracts || 'None'}\n\n## Decisions\n${project.plan.adrs.map((item) => `- **${item.id}** ${item.title}: ${item.decision}`).join('\n') || 'None'}\n` },
    { path: '.specify/studio/tasks.md', content: `# Tasks: ${project.name}\n\n${tasks || 'None'}\n` },
    { path: '.specify/studio/constitution.md', content: `# Constitution: ${project.constitution.title}\n\n${rules || 'None'}\n` },
  ];
  const targets: AgentTarget[] = ['copilot', 'codex', 'claude', 'gemini', 'cursor'];
  for (const task of project.tasks.tasks) for (const target of targets) files.push({ path: `.specify/studio/prompts/${task.id.toLowerCase()}.${target}.md`, content: portableTaskPrompt(project, task, target) });
  return files;
}
