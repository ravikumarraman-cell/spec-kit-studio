import type { ViewTab } from '../../types/speckit';

/** A typed intent keeps dashboard cards decoupled from the application shell. */
export interface DashboardDestination {
  tab: ViewTab;
  label: string;
}

export const dashboardDestination = (tab: ViewTab, label: string): DashboardDestination => ({ tab, label });
