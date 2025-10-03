// apps/client/src/app/(client)/_components/StoreInitializer.jsx
'use client'

import { useEffect, useRef } from 'react'
import useAppStore from '@/lib/store/use-app-store'

export function StoreInitializer({ totals }) {
  const initialized = useRef(false)
  const { setEventTotal, setArticleTotal, setOpportunityTotal } = useAppStore()

  useEffect(() => {
    // This effect runs once on mount to initialize the store with server-fetched data.
    if (!initialized.current) {
      setEventTotal(totals.eventTotal)
      setArticleTotal(totals.articleTotal)
      setOpportunityTotal(totals.opportunityTotal)
      initialized.current = true
    }
  }, [totals, setEventTotal, setArticleTotal, setOpportunityTotal])

  return null // This component renders nothing.
}
