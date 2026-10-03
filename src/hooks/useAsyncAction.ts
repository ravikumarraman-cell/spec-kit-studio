import { useCallback, useEffect, useRef, useState } from 'react';

function actionErrorMessage(cause: unknown): string {
  return cause instanceof Error && cause.message ? cause.message : 'Request failed.';
}

/** Consistent loading/error lifecycle for API-backed user actions. */
export function useAsyncAction<TArgs extends unknown[], TResult>(action: (...args: TArgs) => Promise<TResult>) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const run = useCallback(async (...args: TArgs) => {
    if (mounted.current) { setIsPending(true); setError(null); }
    try { return await action(...args); }
    catch (cause: unknown) { if (mounted.current) setError(actionErrorMessage(cause)); throw cause; }
    finally { if (mounted.current) setIsPending(false); }
  }, [action]);
  return { run, isPending, error, clearError: () => { if (mounted.current) setError(null); } };
}
