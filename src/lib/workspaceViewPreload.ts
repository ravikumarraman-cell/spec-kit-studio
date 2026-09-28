import type { ViewTab } from '../types/speckit';

/**
 * Keep navigation feeling immediate without turning the application shell into
 * a monolithic download. These are intentionally only the most likely next
 * destinations in each workflow. A route is still loaded on demand if it is
 * not in this map.
 */
const warmupTargets: Partial<Record<ViewTab, ViewTab[]>> = {
  overview: ['journey', 'workspace'],
  journey: ['spec', 'plan', 'tasks', 'refinery'],
  refinery: ['journey', 'spec'],
  workspace: ['journey'],
  spec: ['plan', 'tasks'],
  plan: ['tasks', 'prompt'],
  tasks: ['prompt', 'audit'],
  prompt: ['journey', 'audit'],
  audit: ['journey'],
};

export function workspaceViewWarmupTargets(activeTab: ViewTab): ViewTab[] {
  return warmupTargets[activeTab] ?? [];
}
