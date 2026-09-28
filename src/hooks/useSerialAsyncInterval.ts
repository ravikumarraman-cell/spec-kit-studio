import { useEffect, useRef } from 'react';
import { createSerialAsyncGate } from '../lib/serialAsyncGate';

/**
 * Refreshes immediately and on an interval without overlapping requests.
 * `isCurrent` prevents a completed request from updating a replaced screen.
 */
export function useSerialAsyncInterval(
  task: (isCurrent: () => boolean) => Promise<void>,
  intervalMs: number,
  enabled: boolean,
  resetKey: string,
) {
  const taskRef = useRef(task);
  taskRef.current = task;
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const run = createSerialAsyncGate(() => taskRef.current(() => active));
    const requestRun = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      void run();
    };
    const onVisibilityChange = () => { if (document.visibilityState !== 'hidden') requestRun(); };
    requestRun();
    const timer = window.setInterval(requestRun, intervalMs);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [enabled, intervalMs, resetKey]);
}
