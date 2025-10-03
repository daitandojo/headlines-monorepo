// apps/client/src/app/providers.jsx
'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/lib/auth/AuthProvider'
import { useState } from 'react'

export function AppProviders({ children }) {
  const [queryClient] = useState(() => new QueryClient())

  // AuthProvider needs an initialUser. Since this is now a full client component,
  // we start with null and let the provider logic handle fetching/redirecting.
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider initialUser={null}>{children}</AuthProvider>
    </QueryClientProvider>
  )
}
