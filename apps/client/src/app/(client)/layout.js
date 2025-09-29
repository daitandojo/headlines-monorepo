'use server'

import { getDashboardStats, getGlobalCountries } from '@headlines/data-access'
import { ClientLayoutWrapper } from './client-layout-wrapper'

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

  return <ClientLayoutWrapper serverProps={serverProps}>{children}</ClientLayoutWrapper>
}
