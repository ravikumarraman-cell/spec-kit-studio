export interface ConnectorRelease {
  packageName: string;
  version: string;
  apiVersion: number;
  downloadPath: string;
}

const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;
const DOWNLOAD_PATTERN = /^\/downloads\/spec-kit-studio-local-connector-\d+\.\d+\.\d+\.tgz$/;

export function isConnectorRelease(value: unknown): value is ConnectorRelease {
  if (!value || typeof value !== 'object') return false;
  const release = value as Partial<ConnectorRelease>;
  return typeof release.packageName === 'string'
    && typeof release.version === 'string' && VERSION_PATTERN.test(release.version)
    && typeof release.apiVersion === 'number'
    && typeof release.downloadPath === 'string' && DOWNLOAD_PATTERN.test(release.downloadPath);
}

/** Returns true only for a newer stable connector release. */
export function isConnectorVersionOlder(installed: string, available: string): boolean {
  if (!VERSION_PATTERN.test(installed) || !VERSION_PATTERN.test(available)) return false;
  const current = installed.split('.').map(Number);
  const latest = available.split('.').map(Number);
  return latest.some((part, index) => part !== current[index] && part > current[index]
    && latest.slice(0, index).every((previous, previousIndex) => previous === current[previousIndex]));
}

/** The hosted release manifest is public metadata; it contains no local configuration. */
export async function fetchConnectorRelease(): Promise<ConnectorRelease | null> {
  try {
    const response = await fetch('/downloads/local-connector.json', { cache: 'no-store' });
    if (!response.ok) return null;
    const release: unknown = await response.json();
    return isConnectorRelease(release) ? release : null;
  } catch {
    return null;
  }
}
