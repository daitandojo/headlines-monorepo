// File (3 of 5): headlines/src/app/(client)/layout.js
import { getDashboardStats, getGlobalCountries } from '@headlines/data-access'
import { ClientLayoutWrapper } from './client-layout-wrapper' // Import the new wrapper

// This is a Server Component. It fetches data and passes it to the client wrapper.
export default async function ClientLayout({ children }) {
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
    // The wrapper receives server-fetched data as props.
    <ClientLayoutWrapper serverProps={serverProps}>{children}</ClientLayoutWrapper>
  )
}
