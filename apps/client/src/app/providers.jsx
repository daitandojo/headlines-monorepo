'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/lib/auth/AuthProvider'
import { useState } from 'react'
import { Toaster } from 'sonner' // Assuming you have this component for toast notifications

export function AppProviders({ children }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    // QueryClientProvider MUST be the outermost provider for TanStack Query to work.
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
      <Toaster />
    </QueryClientProvider>
  )
}
