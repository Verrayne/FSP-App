import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCallback, useState, type ReactNode } from 'react'

import { ErrorBoundary } from '../../components/shared/ErrorBoundary'
import { AuthProvider } from './AuthProvider'

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
          mutations: { retry: false },
        },
      }),
  )
  const clearQueryCache = useCallback(() => queryClient.clear(), [queryClient])

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider onSignedOut={clearQueryCache}>{children}</AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
