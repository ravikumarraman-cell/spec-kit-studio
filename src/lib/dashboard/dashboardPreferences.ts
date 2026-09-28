/**
 * UI-only preference keys. Authoritative workflow state must remain in the
 * project aggregate, never in this module.
 */
export function dashboardPreferenceKey(projectId: string, section: string) {
  return `speckit:dashboard:${encodeURIComponent(projectId)}:${encodeURIComponent(section)}`;
}

export type DashboardDisclosure = 'readiness' | 'insights';
export type DashboardDisclosurePreferences = Record<DashboardDisclosure, boolean>;

const defaults: DashboardDisclosurePreferences = { readiness: false, insights: false };

/** Preferences are deliberately presentation-only and scoped to one local workspace. */
export function readDashboardDisclosurePreferences(projectId: string): DashboardDisclosurePreferences {
  if (typeof window === 'undefined') return defaults;
  return (Object.keys(defaults) as DashboardDisclosure[]).reduce((preferences, section) => {
    const saved = window.localStorage.getItem(dashboardPreferenceKey(projectId, section));
    return { ...preferences, [section]: saved === null ? defaults[section] : saved === 'true' };
  }, defaults);
}

export function saveDashboardDisclosurePreference(projectId: string, section: DashboardDisclosure, open: boolean) {
  if (typeof window !== 'undefined') window.localStorage.setItem(dashboardPreferenceKey(projectId, section), String(open));
}
