import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';
import type { FallbackProps } from 'react-error-boundary';

export function ApplicationErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const message = error instanceof Error ? error.message : 'The workspace could not be displayed.';

  return (
    <main className="theme-canvas flex min-h-screen items-center justify-center p-6">
      <section role="alert" className="theme-card w-full max-w-xl rounded-lg border border-rose-400/40 p-6 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-rose-500/10 p-2 text-rose-400">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold theme-text">Spec-Kit Studio needs to recover</h1>
            <p className="mt-2 text-sm theme-text-muted">
              Your locally saved project data is unchanged. Retry the workspace, or reload the application if the problem continues.
            </p>
            <details className="mt-4 rounded-md border theme-border-subtle p-3 text-xs theme-text-muted">
              <summary className="cursor-pointer font-semibold">Technical detail</summary>
              <p className="mt-2 wrap-break-word font-mono">{message}</p>
            </details>
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" onClick={resetErrorBoundary} className="inline-flex items-center gap-2 rounded-md bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500">
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Retry workspace
              </button>
              <button type="button" onClick={() => window.location.reload()} className="inline-flex items-center gap-2 rounded-md border theme-border-subtle px-4 py-2 text-sm font-semibold theme-text hover:bg-white/5">
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Reload application
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}