// src/app/sources/use-source-health-checker.js (version 1.1.0)
'use client'

import { useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'

export function useSourceHealthChecker(onSourceUpdate) {
  const [liveStatuses, setLiveStatuses] = useState({})
  const [isCheckingAll, setIsCheckingAll] = useState(false)
  const isCheckingRef = useRef(false)

  const handleCheckFiltered = async (filteredSources) => {
    if (!filteredSources || filteredSources.length === 0) {
      toast.info('No sources in the current view to check.')
      return
    }

    const sourcesToCheck = filteredSources.filter((s) => {
      const status = liveStatuses[s._id]
      return !status || status.count === undefined || status.count <= 0
    })

    if (sourcesToCheck.length === 0) {
      toast.success('All sources in the current view are already verified.')
      return
    }

    toast.info(
      `Starting health check for ${sourcesToCheck.length} unverified source(s)...`
    )
    isCheckingRef.current = true
    setIsCheckingAll(true)

    for (const source of sourcesToCheck) {
      if (!isCheckingRef.current) {
        toast.warning('Health check cancelled by user.')
        break
      }
      setLiveStatuses((prev) => ({ ...prev, [source._id]: { checking: true } }))
      try {
        const res = await fetch('/api/scrape/test-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(source),
        })
        const data = await res.json()
        if (!res.ok || !data.success) {
          throw new Error(data.details || 'Scrape failed')
        }
        onSourceUpdate(data.updatedSource)
        setLiveStatuses((prev) => ({
          ...prev,
          [source._id]: { checking: false, count: data.count },
        }))
      } catch (error) {
        setLiveStatuses((prev) => ({
          ...prev,
          [source._id]: { checking: false, count: -1, error: error.message },
        }))
      }
    }

    if (isCheckingRef.current) {
      toast.success('Health check complete.')
    }
    isCheckingRef.current = false
    setIsCheckingAll(false)
  }

  const handleStopCheck = () => {
    isCheckingRef.current = false
  }

  const handleTestComplete = useCallback(
    (sourceId, count, updatedSource) => {
      setLiveStatuses((prev) => ({
        ...prev,
        [sourceId]: { checking: false, count },
      }))
      if (updatedSource) {
        onSourceUpdate(updatedSource)
      }
    },
    [onSourceUpdate]
  )

  return {
    liveStatuses,
    isCheckingAll,
    handleCheckFiltered,
    handleStopCheck,
    handleTestComplete,
  }
}
