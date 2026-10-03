import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ComponentUpdate, availableComponentUpdates } from '../lib/componentUpdates';
import { configuredConnectorUrl, connectorClient, CONNECTOR_CONFIGURATION_CHANGED_EVENT } from '../lib/connector';
import { fetchConnectorRelease } from '../lib/connectorRelease';
import { getConnectorSessionToken } from '../lib/connectorSession';
import { PWA_UPDATE_AVAILABLE_EVENT } from '../lib/pwa';

declare const __APP_VERSION__: string;

export function useComponentUpdates(additionalUpdates: ComponentUpdate[] = []) {
  const requestSequence = useRef(0);
  const [availableVersion, setAvailableVersion] = useState<string>();
  const [connectorVersion, setConnectorVersion] = useState<string>();
  const [workerUpdateReady, setWorkerUpdateReady] = useState(false);

  const refresh = useCallback(async () => {
    const sequence = ++requestSequence.current;
    const connectorUrl = configuredConnectorUrl();
    const releasePromise = fetchConnectorRelease();
    let healthPromise;
    try {
      healthPromise = connectorClient(connectorUrl, getConnectorSessionToken(connectorUrl)).health().catch(() => null);
    } catch {
      healthPromise = Promise.resolve(null);
    }
    const release = await releasePromise;
    if (sequence !== requestSequence.current) return;
    setAvailableVersion(release?.version);

    const health = await healthPromise;
    if (sequence !== requestSequence.current) return;
    setConnectorVersion(health?.version);
  }, []);

  useEffect(() => {
    void refresh();
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    const markWorkerUpdateReady = () => setWorkerUpdateReady(true);
    window.addEventListener('focus', refresh);
    window.addEventListener(CONNECTOR_CONFIGURATION_CHANGED_EVENT, refresh);
    window.addEventListener(PWA_UPDATE_AVAILABLE_EVENT, markWorkerUpdateReady);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener(CONNECTOR_CONFIGURATION_CHANGED_EVENT, refresh);
      window.removeEventListener(PWA_UPDATE_AVAILABLE_EVENT, markWorkerUpdateReady);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [refresh]);

  const updates = useMemo(() => availableComponentUpdates({
    app: { currentVersion: __APP_VERSION__, availableVersion, workerUpdateReady },
    connector: connectorVersion ? { currentVersion: connectorVersion, availableVersion } : undefined,
  }), [availableVersion, connectorVersion, workerUpdateReady]);

  return { updates: [...updates, ...additionalUpdates], refresh };
}