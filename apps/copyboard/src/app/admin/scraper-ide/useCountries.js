'use client'

import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'

async function fetchCountries() {
  const res = await fetch('/api-admin/countries')
  if (!res.ok) {
    const errorData = await res.json()
    throw new Error(errorData.error || 'Failed to fetch countries from API')
  }
  return res.json()
}

export function useCountries() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-countries'],
    queryFn: fetchCountries,
  })

  if (isError) {
    toast.error('Could not load countries', { description: error.message })
  }

  return {
    countries: data?.data || [],
    isLoading,
  }
}
