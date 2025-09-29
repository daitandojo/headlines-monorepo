'use client'

import { useState, useEffect, useCallback } from 'react'
import { useDebounce } from './use-debounce'
import { toast } from 'sonner'

// The hook no longer needs initialData or initialTotal.
// It will be responsible for its own initial fetch.
export function useEntityManager(apiPath) {
  const [data, setData] = useState([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true) // Start in a loading state
  const [page, setPage] = useState(1)
  const [sorting, setSorting] = useState([])
  const [columnFilters, setColumnFilters] = useState([])
  const debouncedFilters = useDebounce(columnFilters, 500)

  const fetchEntities = useCallback(async () => {
    setIsLoading(true)
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

      const res = await fetch(`/api-admin/${apiPath}?${params.toString()}`)
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.details || `Failed to fetch from ${apiPath}.`)
      }
      const result = await res.json()
      setData(result.data || [])
      setTotal(result.total || 0)
    } catch (err) {
      toast.error(`Failed to load data`, { description: err.message })
      setData([]) // Clear data on error
      setTotal(0)
    } finally {
      setIsLoading(false)
    }
  }, [apiPath, page, sorting, debouncedFilters])

  // This useEffect now fetches on mount and whenever the dependencies change.
  useEffect(() => {
    fetchEntities()
  }, [fetchEntities]) // fetchEntities is stable due to useCallback

  return {
    data,
    setData,
    total,
    isLoading,
    refetch: fetchEntities,
    page,
    setPage,
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
  }
}
