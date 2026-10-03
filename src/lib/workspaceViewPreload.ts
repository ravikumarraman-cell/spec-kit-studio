import type { ViewTab } from '../types/speckit';

/**
 * Keep navigation feeling immediate without turning the application shell into
 * a monolithic download. These are intentionally only the most likely next
 * destinations in each workflow. A route is still loaded on demand if it is
 * not in this map.
 */
const warmupTargets: Partial<Record<ViewTab, ViewTab[]>> = {
  // The overview is the first screen for every user. Do not download
  // engineering-only views until a user chooses that route or signals intent
  // to open it; this keeps a product-first, mobile, or metered first visit
  // genuinely lightweight.
  overview: [],
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

type ConnectionHints = { saveData?: boolean; effectiveType?: string } | undefined;

/** Avoid speculative downloads when the browser has identified the connection
 * as metered or slow. Navigation still loads every view on demand. */
export function shouldWarmWorkspaceViews(connection: ConnectionHints): boolean {
  return !connection?.saveData && connection?.effectiveType !== 'slow-2g' && connection?.effectiveType !== '2g';
}
