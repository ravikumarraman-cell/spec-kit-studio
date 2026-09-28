import type { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';
import { ApplicationErrorFallback } from '../components/common/ApplicationErrorFallback';
import { StudioApiError } from '../lib/api/errors';

function shouldRetry(failureCount: number, error: unknown) {
  if (failureCount >= 2) return false;
  if (!(error instanceof StudioApiError)) return true;
  return error.retryable;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: shouldRetry,
      staleTime: 1000 * 60 * 5,
    },
    mutations: {
      retry: false,
    },
  },
});

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
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ErrorBoundary>
  );
}