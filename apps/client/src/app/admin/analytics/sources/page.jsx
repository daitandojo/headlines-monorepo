// apps/client/src/app/admin/analytics/sources/page.jsx
'use client'

import { useQuery } from '@tanstack/react-query'
import { PageHeader, DataTable, Skeleton } from '@/components/shared'
import { columns } from './columns'

const QUERY_KEY = 'source-analytics'
const API_ENDPOINT = '/api-admin/analytics/sources'

async function fetchSourceAnalytics() {
  const res = await fetch(API_ENDPOINT)
  if (!res.ok) {
    const errorData = await res.json()
    throw new Error(errorData.error || 'Failed to fetch source analytics')
  }
  return res.json()
}

export default function SourceAnalyticsPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: fetchSourceAnalytics,
  })

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Source Performance Dashboard"
        description="Analyze the effectiveness of each news source based on success and relevance rates."
      />
      <div className="mt-8 flex-grow min-h-0">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : isError ? (
          <div className="text-red-500 bg-red-500/10 p-4 rounded-md">
            Error loading data: {error.message}
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={data?.data || []}
            filterColumn="name"
            filterPlaceholder="Filter by source name..."
          />
        )}
      </div>
    </div>
  )
}