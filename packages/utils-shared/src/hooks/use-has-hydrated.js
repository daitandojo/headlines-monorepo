// packages/utils-shared/src/hooks/use-has-hydrated.js (version 2.0.3 - Final Generic)
'use client'

import { useState, useEffect } from 'react'

/**
 * A generic hook to detect when client-side hydration is complete.
 * This is useful for preventing UI that relies on client-state (like localStorage)
 * from rendering on the server and causing a mismatch.
 */
export function useHasHydrated() {
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  return hydrated
}
