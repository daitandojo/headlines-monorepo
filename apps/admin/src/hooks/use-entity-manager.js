// apps/admin/src/hooks/use-entity-manager.js (version 2.1.0)
'use client'

import { useState, useEffect, useCallback } from 'react'

export function useEntityManager(apiPath, entityName, defaultSortKey, options = {}) {
  const { dataKey } = options
  const [entities, setEntities] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchEntities = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    return fetch(apiPath)
      .then(async (res) => {
        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(errorData.details || `Failed to fetch from ${apiPath}.`)
        }
        return res.json()
      })
      .then((data) => {
        // DEFINITIVE FIX: Check if the API response has a 'data' property that is an array.
        // This handles server-paginated endpoints that return an object like { data: [...], total: ... }.
        if (data && Array.isArray(data.data)) {
          setEntities(data.data)
          return
        }

        if (dataKey && data[dataKey] && Array.isArray(data[dataKey])) {
          setEntities(data[dataKey])
          return
        }

        const lowerEntityName = entityName.toLowerCase()
        const keyMappings = {
          country: 'countries',
          watchlistentity: 'entities',
          subscriber: 'subscribers',
        }
        const key = keyMappings[lowerEntityName] || `${lowerEntityName.toLowerCase()}s`

        if (data[key] && Array.isArray(data[key])) {
          // Perform default sort on the client after fetching
          const sortedData = [...data[key]].sort((a, b) => {
            // Handle nested keys like 'analytics.totalRelevant'
            const getDeepValue = (obj, path) =>
              path.split('.').reduce((o, i) => (o ? o[i] : 0), obj)
            const valA = getDeepValue(a, defaultSortKey)
            const valB = getDeepValue(b, defaultSortKey)
            if (typeof valA === 'number' && typeof valB === 'number') {
              return valB - valA // Default to descending for numbers
            }
            if (typeof valA === 'string' && typeof valB === 'string') {
              return valA.localeCompare(valB) // Default to ascending for strings
            }
            return 0
          })
          setEntities(sortedData)
        } else {
          if (
            typeof data === 'object' &&
            data !== null &&
            !Array.isArray(data) &&
            Object.keys(data).length > 0
          ) {
            setEntities(data)
          } else {
            throw new Error(
              `API response from '${apiPath}' did not contain the expected key: '${key}' or '${dataKey}'.`
            )
          }
        }
      })
      .catch((err) => {
        console.error(err)
        setError(err.message)
      })
      .finally(() => setIsLoading(false))
  }, [apiPath, entityName, dataKey, defaultSortKey])

  useEffect(() => {
    fetchEntities()
  }, [fetchEntities])

  const handleSave = useCallback((savedEntity) => {
    setEntities((prev) => {
      if (!prev || !Array.isArray(prev)) return [savedEntity]

      const exists = prev.some((e) => e._id === savedEntity._id)
      if (exists) {
        return prev.map((e) => (e._id === savedEntity._id ? savedEntity : e))
      } else {
        return [savedEntity, ...prev]
      }
    })
  }, [])

  return {
    entities,
    setEntities,
    isLoading,
    error,
    handleSave,
    refetch: fetchEntities,
  }
}
