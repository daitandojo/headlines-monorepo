// apps/client/src/app/(client)/layout.js
'use server'

import { getDashboardStats, getGlobalCountries } from '@headlines/data-access/next'
import { ClientLayoutWrapper } from './client-layout-wrapper'
import { StoreInitializer } from './_components/StoreInitializer'

export default async function ClientLayout({ children }) {
  // Re-fetch all stats on the server for initial hydration.
  const [statsResult, countriesResult] = await Promise.all([
    getDashboardStats().catch((e) => ({ success: false, data: null })),
    getGlobalCountries().catch((e) => ({ success: false, data: [] })),
  ])

  const initialTotals = {
    articleTotal: statsResult.data?.articles?.total || 0,
    eventTotal: statsResult.data?.events?.total || 0,
    opportunityTotal: statsResult.data?.opportunities?.total || 0,
  }

  const serverProps = {
    globalCountries: countriesResult.data || [],
  }

  return (
    <>
      <StoreInitializer totals={initialTotals} />
      <ClientLayoutWrapper serverProps={serverProps}>{children}</ClientLayoutWrapper>
    </>
  )
}
