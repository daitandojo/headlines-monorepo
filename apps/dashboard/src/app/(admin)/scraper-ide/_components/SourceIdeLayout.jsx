// Full Path: headlines/src/app/(admin)/scraper-ide/_components/SourceIdeLayout.jsx
'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useEntityManager } from '@/hooks/use-entity-manager'
import { SourceList } from '@/components/admin/source-list' // CORRECTED IMPORT
import { ScraperIde } from './ScraperIde'
import { useSourceHealthChecker } from '../../sources/use-source-health-checker'
import { toast } from 'sonner'
import { testSourceConfigClient as testSourceConfig } from '@/lib/api-client'

const EMPTY_SOURCE = {
  name: '',
  country: '',
  baseUrl: '',
  sectionUrl: '',
  status: 'active',
  scrapeFrequency: 'high',
  extractionMethod: 'declarative',
  headlineSelector: [],
  linkSelector: '',
  headlineTextSelector: '',
  articleSelector: [],
}

export function SourceIdeLayout() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const {
    entities: sources,
    setEntities,
    isLoading: isLoadingSources,
    error: sourcesError,
    handleSave: handleEntitySave,
  } = useEntityManager('/api-admin/sources', 'Source', 'name')

  const {
    entities: countries,
    isLoading: isLoadingCountries,
    error: countriesError,
  } = useEntityManager('/api-admin/countries', 'Country', 'name')

  const [selectedSourceId, setSelectedSourceId] = useState(searchParams.get('sourceId'))

  useEffect(() => {
    setSelectedSourceId(searchParams.get('sourceId'))
  }, [searchParams])

  const handleSourceUpdate = useCallback(
    (updatedSource) => {
      setEntities((prev) =>
        prev.map((s) => (s._id === updatedSource._id ? updatedSource : s))
      )
    },
    [setEntities]
  )

  const {
    liveStatuses,
    isCheckingAll,
    handleCheckFiltered,
    handleStopCheck,
    handleTestComplete,
  } = useSourceHealthChecker(handleSourceUpdate)

  const availableCountries = useMemo(() => {
    if (!countries) return []
    return countries
      .filter((c) => c.status === 'active')
      .map((c) => c.name)
      .sort()
  }, [countries])

  const handleTest = useCallback(
    async (source) => {
      const toastId = toast.loading(`Running test scrape for "${source.name}"...`)
      const result = await testSourceConfig(source)
      if (result.success) {
        handleEntitySave(result.data.updatedSource)
        handleTestComplete(source._id, result.data.count, result.data.updatedSource)
        toast.success(`Test complete! Found ${result.data.count} headlines.`, {
          id: toastId,
        })
        return result.data
      } else {
        toast.error(`Test failed: ${result.details || 'Unknown error'}`, { id: toastId })
        return null
      }
    },
    [handleEntitySave, handleTestComplete]
  )

  const selectedSourceData = useMemo(() => {
    if (!selectedSourceId) {
      const prefillName = searchParams.get('name') || ''
      const prefillUrl = searchParams.get('sectionUrl') || ''
      let prefillBaseUrl = ''
      try {
        prefillBaseUrl = prefillUrl ? new URL(prefillUrl).origin : ''
      } catch (e) {}
      return {
        ...EMPTY_SOURCE,
        name: prefillName,
        sectionUrl: prefillUrl,
        baseUrl: prefillBaseUrl,
        country: searchParams.get('country') || '',
      }
    }
    return sources?.find((s) => s._id === selectedSourceId) || EMPTY_SOURCE
  }, [selectedSourceId, sources, searchParams])

  const handleSelectSource = (id) => {
    const newSearchParams = new URLSearchParams(searchParams.toString())
    if (id) {
      newSearchParams.set('sourceId', id)
    } else {
      newSearchParams.delete('sourceId')
    }
    router.push(`/scraper-ide?${newSearchParams.toString()}`)
  }

  return (
    <div className="flex flex-row h-[calc(100vh-4rem)] w-full -m-6">
      <SourceList
        sources={sources}
        isLoading={isLoadingSources || isLoadingCountries}
        selectedSourceId={selectedSourceId}
        onSelectSource={handleSelectSource}
        onAddSource={() => handleSelectSource(null)}
        onCheckFiltered={handleCheckFiltered}
        onStopCheck={handleStopCheck}
        isCheckingAll={isCheckingAll}
        liveStatuses={liveStatuses}
        countries={['all', ...availableCountries]}
      />
      <div className="flex-grow min-w-0">
        <ScraperIde
          key={selectedSourceId || 'new'}
          sourceData={selectedSourceData}
          onSave={handleEntitySave}
          onTest={handleTest}
          allCountries={availableCountries}
        />
      </div>
    </div>
  )
}
