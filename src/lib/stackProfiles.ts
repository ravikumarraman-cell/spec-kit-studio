import { SpecKitProject } from '../types/speckit';

export interface StackProfile { id: string; label: string; testCommands: string[]; prohibitedPaths: string[]; guidance: string; }
const profiles: Record<string, StackProfile> = {
  node: { id: 'node', label: 'Node.js / TypeScript', testCommands: ['npm run lint', 'npm test', 'npm run build'], prohibitedPaths: ['.env', '.env.*', 'node_modules'], guidance: 'Respect the committed lockfile and repository package manager.' },
  python: { id: 'python', label: 'Python', testCommands: ['python -m pytest'], prohibitedPaths: ['.env', '.venv', '__pycache__'], guidance: 'Use the repository-managed Python environment; never run production migrations.' },
  infrastructure: { id: 'infrastructure', label: 'Infrastructure as Code', testCommands: ['terraform fmt -check', 'terraform validate', 'terraform plan'], prohibitedPaths: ['*.tfstate', '*.tfstate.*', '.terraform'], guidance: 'Plan is review evidence only. Never apply infrastructure changes from an agent task.' },
  generic: { id: 'generic', label: 'Repository-defined stack', testCommands: [], prohibitedPaths: ['.env', '.env.*'], guidance: 'Use only the checks declared by the connected repository.' },
};
export function resolveStackProfile(project: SpecKitProject): StackProfile {
  if (project.stackProfile?.id && profiles[project.stackProfile.id]) return { ...profiles[project.stackProfile.id], ...project.stackProfile, label: profiles[project.stackProfile.id].label, guidance: profiles[project.stackProfile.id].guidance, prohibitedPaths: project.stackProfile.prohibitedPaths || profiles[project.stackProfile.id].prohibitedPaths, testCommands: project.stackProfile.testCommands || profiles[project.stackProfile.id].testCommands };
  const tech = project.importedRepo?.detectedTechStack.map((item) => item.name.toLowerCase()).join(' ') || '';
  if (/terraform|bicep/.test(tech)) return profiles.infrastructure;
  if (/python|flask|fastapi|django/.test(tech)) return profiles.python;
  if (/node|react|next|typescript|javascript/.test(tech)) return profiles.node;
  return profiles.generic;
}
