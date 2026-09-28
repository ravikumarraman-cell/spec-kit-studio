import { useCallback, useEffect, useRef } from 'react';

/** Owns polling lifetimes for a screen and aborts them on unmount. */
export function useConnectorPollingAbort() {
  const controllers = useRef(new Set<AbortController>());
  const abortAll = useCallback(() => {
    controllers.current.forEach((controller) => controller.abort());
    controllers.current.clear();
  }, []);
  useEffect(() => abortAll, [abortAll]);
  const beginPolling = useCallback(() => {
    const controller = new AbortController();
    controllers.current.add(controller);
    return { signal: controller.signal, release: () => controllers.current.delete(controller) };
  }, [abortAll]);
  return { beginPolling, abortAll };
}
