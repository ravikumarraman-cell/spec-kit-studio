import { useCallback, useState } from 'react';

/** Consistent loading/error lifecycle for API-backed user actions. */
export function useAsyncAction<TArgs extends unknown[], TResult>(action: (...args: TArgs) => Promise<TResult>) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = useCallback(async (...args: TArgs) => {
    setIsPending(true); setError(null);
    try { return await action(...args); }
    catch (cause: any) { setError(cause.message || 'Request failed.'); throw cause; }
    finally { setIsPending(false); }
  }, [action]);
  return { run, isPending, error, clearError: () => setError(null) };
}
