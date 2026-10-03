export type ComponentUpdateAction = 'reload-app' | 'open-connector';

export interface ComponentUpdate {
  id: string;
  name: string;
  currentVersion?: string;
  availableVersion?: string;
  summary: string;
  action: ComponentUpdateAction;
  actionLabel: string;
}

const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

export function isVersionOlder(currentVersion: string, availableVersion: string): boolean {
  if (!VERSION_PATTERN.test(currentVersion) || !VERSION_PATTERN.test(availableVersion)) return false;
  const current = currentVersion.split('.').map(Number);
  const available = availableVersion.split('.').map(Number);
  for (let index = 0; index < current.length; index += 1) {
    if (available[index] !== current[index]) return available[index] > current[index];
  }
  return false;
}

export function availableComponentUpdates({
  app,
  connector,
}: {
  app: { currentVersion: string; availableVersion?: string; workerUpdateReady?: boolean };
  connector?: { currentVersion: string; availableVersion?: string };
}): ComponentUpdate[] {
  const updates: ComponentUpdate[] = [];
  const appUpdateAvailable = Boolean(app.workerUpdateReady
    || (app.availableVersion && isVersionOlder(app.currentVersion, app.availableVersion)));

  if (appUpdateAvailable) {
    updates.push({
      id: 'studio-app',
      name: 'Studio app',
      currentVersion: app.currentVersion,
      availableVersion: app.availableVersion,
      summary: 'A newer Studio experience is ready. Reload when you are ready to switch versions.',
      action: 'reload-app',
      actionLabel: 'Reload Studio',
    });
  }

  if (connector?.availableVersion && isVersionOlder(connector.currentVersion, connector.availableVersion)) {
    updates.push({
      id: 'local-connector',
      name: 'Local connector',
      currentVersion: connector.currentVersion,
      availableVersion: connector.availableVersion,
      summary: 'Update the local connector to keep repository and agent capabilities aligned with Studio.',
      action: 'open-connector',
      actionLabel: 'View update steps',
    });
  }

  return updates;
}