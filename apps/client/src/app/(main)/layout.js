// src/app/(main)/layout.js (version 9.1)
import { cache } from 'react'
import { getTotalArticleCount } from '@/actions/articles'
import { getTotalEventCount } from '@/actions/events'
import { getTotalOpportunitiesCount } from '@/actions/opportunities'
import { getGlobalCountries } from '@/actions/countries'
import { Providers } from '../providers'
import { ConditionalLayout } from '@/components/ConditionalLayout'

// Wrap the data fetching logic in a cached function
const getLayoutData = cache(
  async () => {
    console.log('[Layout] Fetching global data for layout...')
    const [articleCount, eventCount, opportunityCount, globalCountries] =
      await Promise.all([
        getTotalArticleCount(),
        getTotalEventCount(),
        getTotalOpportunitiesCount(),
        getGlobalCountries(),
      ])
    return { articleCount, eventCount, opportunityCount, globalCountries }
  },
  ['global-layout-data'],
  { revalidate: 60 }
) // Revalidate every 60 seconds

export default async function MainLayout({ children }) {
  const layoutProps = await getLayoutData()

  return (
    <Providers>
      <ConditionalLayout serverProps={layoutProps}>{children}</ConditionalLayout>
    </Providers>
  )
}
