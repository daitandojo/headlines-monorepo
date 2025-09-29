// packages/utils-shared/src/hooks/use-has-hydrated.js (version 2.0.0)
'use client'

import { useState, useEffect } from 'react'

// This is a generic hook to detect when client-side hydration is complete.
// It is no longer tied to a specific Zustand store.
export function useHasHydrated() {
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  return hydrated
}
