export type CollaborationProvider = 'templates' | 'github' | 'gitlab';
export interface ProviderOption { id: CollaborationProvider; label: string; description: string; capabilities: string[]; }
export const providerOptions: ProviderOption[] = [
  { id: 'templates', label: 'Export templates only', description: 'Safest default: download/commit feature packages and CI templates yourself.', capabilities: ['No credentials', 'No remote writes', 'Works with any Git host'] },
  { id: 'github', label: 'GitHub', description: 'Use existing GitHub repository selection and explicit publication confirmation.', capabilities: ['Repository discovery', 'Explicit spec publication', 'PR/Actions templates'] },
  { id: 'gitlab', label: 'GitLab', description: 'Generate GitLab MR and CI templates; direct API publishing is intentionally not enabled yet.', capabilities: ['MR templates', 'CI concurrency templates', 'No stored token required'] },
];
