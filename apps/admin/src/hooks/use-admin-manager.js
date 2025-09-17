// apps/admin/src/hooks/use-admin-manager.js (version 3.3.0 - Correct Serialization)
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useDebounce } from '@headlines/utils/src/index.js'
import { toast } from 'sonner'
import { useAuth } from '@headlines/auth/useAuth'

export function useAdminManager(
  apiPath,
  page,
  sorting,
  columnFilters
) {
  const [data, setData] = useState([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const { user } = useAuth()

  const debouncedFilters = useDebounce(columnFilters, 500)

  const fetchData = useCallback(async () => {
    if (!user) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const sortParam = sorting[0] ? `${sorting[0].id}_${sorting[0].desc ? 'desc' : 'asc'}` : 'createdAt_desc';
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('sort', sortParam);
      
      // Correctly serialize complex objects for URL parameters
      if (debouncedFilters && debouncedFilters.length > 0) {
        params.set('columnFilters', JSON.stringify(debouncedFilters));
      }

      const res = await fetch(`${apiPath}?${params.toString()}`, {
        headers: {
          'x-dev-mode': process.env.NODE_ENV === 'development' ? 'true' : 'false',
        },
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to fetch data.')
      }
      const result = await res.json()
      setData(result.data)
      setTotal(result.total)
    } catch (e) {
      setError(e.message)
      toast.error(`Failed to load data: ${e.message}`)
    } finally {
      setIsLoading(false)
    }
  }, [apiPath, page, sorting, debouncedFilters, user])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    setData,
    total,
    isLoading,
    error,
    refetch: fetchData,
  }
}
