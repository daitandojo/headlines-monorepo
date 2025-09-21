// apps/client/src/app/(protected)/layout.js (NEW FILE)
import { AuthProvider } from '@headlines/auth/AuthProvider'
import { AppShell } from './AppShell'
import { getDashboardStats, getGlobalCountries } from '@headlines/data-access'

export default async function ProtectedLayout({ children }) {
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
    <AuthProvider appType="client">
      <AppShell serverProps={serverProps}>{children}</AppShell>
    </AuthProvider>
  )
}
