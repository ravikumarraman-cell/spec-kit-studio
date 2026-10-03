/** Runs at most one async operation at a time; overlapping callers are skipped. */
export function createSerialAsyncGate(task: () => Promise<void>) {
  let running = false;
  return async (): Promise<boolean> => {
    if (running) return false;
    running = true;
    try {
      await task();
      return true;
    } finally {
      running = false;
    }
  };
}
