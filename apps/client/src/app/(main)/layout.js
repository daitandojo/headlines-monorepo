// apps/client/src/app/(main)/layout.js (version 13.0.0)
'use server'

import { cache } from 'react'
import { getGlobalCountries } from '@headlines/data-access'
import { Providers } from '../providers'
import { ConditionalLayout } from '@/components/ConditionalLayout'

const getLayoutData = cache(
  async () => {
    const result = await getGlobalCountries()
    // DEFINITIVE FIX: Filter the list to only include countries with at least one event
    // before passing it down to any client components.
    const countriesWithEvents = (result?.data || []).filter(
      (country) => country.count > 0
    )
    return { globalCountries: countriesWithEvents }
  },
  ['global-layout-data'],
  { revalidate: 3600 } // Revalidate every hour
)

export default async function MainLayout({ children }) {
  const { globalCountries } = await getLayoutData()

  return (
    <Providers>
      <ConditionalLayout serverProps={{ globalCountries }}>{children}</ConditionalLayout>
    </Providers>
  )
}
