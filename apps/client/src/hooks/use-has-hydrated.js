// src/hooks/use-has-hydrated.js (version 2.0)
'use client'

import { useState, useEffect } from 'react'
import useAppStore from '@/store/use-app-store'

/**
 * A hook that returns `true` only after the Zustand store has been rehydrated
 * from localStorage on the client.
 * @returns {boolean} - `true` if hydrated, `false` otherwise.
 */
export function useHasHydrated() {
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    // The `persist.onFinishHydration` listener is the key. It's a reliable
    // event fired by the middleware precisely when rehydration is complete.
    const unsubFinishHydration = useAppStore.persist.onFinishHydration(() => {
      setHydrated(true)
    })

    // Also set hydrated to true if the store is already hydrated,
    // which can happen on subsequent navigations.
    if (useAppStore.persist.hasHydrated()) {
      setHydrated(true)
    }

    return () => {
      unsubFinishHydration()
    }
  }, [])

  return hydrated
}
