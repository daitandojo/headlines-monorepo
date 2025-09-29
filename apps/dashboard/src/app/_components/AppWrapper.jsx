// File: apps/copyboard/src/app/_components/AppWrapper.jsx (Corrected)

import 'server-only'
import { verifySession } from '@/lib/auth/server'
import { AuthProvider } from '@/lib/auth/AuthProvider'
import { AppShell } from './AppShell' // <-- Import AppShell here
import { getDashboardStats, getGlobalCountries } from '@headlines/data-access'

export async function AppWrapper({ children }) {
  // This Server Component now fetches ALL initial data
  const { user } = await verifySession()

  const [statsResult, countriesResult] = await Promise.all([
    getDashboardStats().catch((e) => ({ success: false, data: null })),
    getGlobalCountries().catch((e) => ({ success: false, data: [] })),
  ])

  const serverProps = {
    articleCount: statsResult.data?.articles?.total || 0,
    eventCount: statsResult.data?.events?.total || 0,
    opportunityCount: statsResult.data?.opportunities?.total || 0,
    globalCountries: countriesResult.data || [],
  }

  return (
    // AuthProvider is a Client Component, receiving the initial user
    <AuthProvider initialUser={user}>
      {/* AppShell is a Client Component, receiving serverProps */}
      <AppShell serverProps={serverProps}>
        {/* The actual page content is rendered inside the AppShell */}
        {children}
      </AppShell>
    </AuthProvider>
  )
}
