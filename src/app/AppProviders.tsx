import type { PropsWithChildren } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { ApplicationErrorFallback } from '../components/common/ApplicationErrorFallback';

function reportFatalRenderError(error: unknown, info: { componentStack?: string | null }) {
  const cause = error instanceof Error ? error : new Error(String(error));
  console.error('Fatal application render error', {
    name: cause.name,
    message: cause.message,
    componentStack: info.componentStack,
  });
}

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ErrorBoundary FallbackComponent={ApplicationErrorFallback} onError={reportFatalRenderError}>
      {children}
    </ErrorBoundary>
  );
}
