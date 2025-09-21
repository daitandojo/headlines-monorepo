// apps/admin/src/app/(protected)/scraper-ide/page.jsx (version 2.0.0)
'use client'

import { Suspense } from 'react'
import { SourceIdeLayout } from './_components/SourceIdeLayout'
import { LoadingOverlay } from '@headlines/ui'

function ScraperIdePageContent() {
  return <SourceIdeLayout />
}

export default function ScraperIdePage() {
  return (
    <Suspense fallback={<LoadingOverlay isLoading={true} text="Loading IDE..." />}>
      <ScraperIdePageContent />
    </Suspense>
  )
}
