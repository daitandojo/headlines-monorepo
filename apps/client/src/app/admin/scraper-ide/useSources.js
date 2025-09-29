'use client'

import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'

// The fetcher function now accepts a country parameter
async function fetchSources(country) {
  const res = await fetch(`/api-admin/sources?country=${encodeURIComponent(country)}`)
  if (!res.ok) {
    const errorData = await res.json()
    throw new Error(errorData.error || 'Failed to fetch sources from API')
  }
  return res.json()
}

export function useSources(country) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-sources', country], // The country is now part of the query key
    queryFn: () => fetchSources(country),
    enabled: !!country, // CRITICAL: Only run the query if a country is selected
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })

  if (isError) {
    toast.error('Could not load sources', { description: error.message })
  }

  return {
    sources: data?.data || [],
    isLoading,
  }
}
