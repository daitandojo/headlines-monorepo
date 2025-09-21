// apps/admin/src/hooks/use-entity-manager.js (version 4.0.1 - Complete)
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useDebounce } from '@headlines/utils-shared'
import { toast } from 'sonner'

export function useEntityManager(apiPath, queryKey, initialSort = []) {
  const [data, setData] = useState([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // State for server-side operations
  const [page, setPage] = useState(1)
  const [sorting, setSorting] = useState(initialSort)
  const [columnFilters, setColumnFilters] = useState([])
  const debouncedFilters = useDebounce(columnFilters, 500)

  const fetchEntities = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const sortParam = sorting[0]
        ? `${sorting[0].id}_${sorting[0].desc ? 'desc' : 'asc'}`
        : null
      const params = new URLSearchParams()
      params.set('page', page.toString())
      if (sortParam) params.set('sort', sortParam)
      if (debouncedFilters && debouncedFilters.length > 0) {
        params.set('columnFilters', JSON.stringify(debouncedFilters))
      }

      const res = await fetch(`${apiPath}?${params.toString()}`)
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.details || `Failed to fetch from ${apiPath}.`)
      }
      const result = await res.json()

      setData(result.data || [])
      setTotal(result.total || 0)
    } catch (err) {
      setError(err.message)
      toast.error(`Failed to load data for ${queryKey}`, { description: err.message })
    } finally {
      setIsLoading(false)
    }
  }, [apiPath, queryKey, page, sorting, debouncedFilters])

  useEffect(() => {
    fetchEntities()
  }, [fetchEntities])

  const handleSave = useCallback(
    (savedEntity) => {
      setData((prev) => {
        const exists = prev.some((e) => e._id === savedEntity._id)
        if (exists) {
          return prev.map((e) => (e._id === savedEntity._id ? savedEntity : e))
        }
        return [savedEntity, ...prev]
      })
      fetchEntities()
    },
    [fetchEntities]
  )

  return {
    data,
    setData,
    total,
    isLoading,
    error,
    handleSave,
    refetch: fetchEntities,
    page,
    setPage,
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
  }
}
