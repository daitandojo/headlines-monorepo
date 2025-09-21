// apps/admin/src/app/(protected)/articles/page.jsx (version 3.1.0)
'use client'

import { PageHeader, DataTable, ExportButton } from '@headlines/ui'
import { columns } from './columns'
import { useEntityManager } from '@/hooks/use-entity-manager'
import { toast } from 'sonner'
import { useCallback } from 'react'
import { deleteArticle, updateArticle, handleExport } from '@/lib/api-client'
import { API_ARTICLES, QUERY_KEY_ARTICLES } from '@/lib/constants'

export default function ArticlesPage() {
  const {
    data,
    setData,
    total,
    isLoading,
    refetch,
    page,
    setPage,
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
  } = useEntityManager(API_ARTICLES, QUERY_KEY_ARTICLES, [
    { id: 'createdAt', desc: true },
  ])

  const handleDelete = useCallback(
    async (articleId) => {
      /* ... implementation ... */
    },
    [data, setData, refetch]
  )
  const handleUpdate = useCallback(
    async (article, updateData) => {
      /* ... implementation ... */
    },
    [setData, refetch]
  )

  const onExport = (fileType) => {
    const sort = sorting[0]
      ? `${sorting[0].id}_${sorting[0].desc ? 'desc' : 'asc'}`
      : 'createdAt_desc'
    return handleExport('articles', fileType, columnFilters, sort)
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Article Management"
        description={`Review and manage all ${total.toLocaleString()} articles.`}
      >
        <ExportButton hasData={data && data.length > 0} onExport={onExport} />
      </PageHeader>
      <div className="mt-8 flex-grow min-h-0 max-w-none">
        <DataTable
          columns={columns(handleUpdate, handleDelete)}
          data={data}
          isLoading={isLoading}
          page={page}
          setPage={setPage}
          total={total}
          sorting={sorting}
          setSorting={setSorting}
          columnFilters={columnFilters}
          setColumnFilters={setColumnFilters}
          filterColumn="headline"
          filterPlaceholder="Filter by headline..."
        />
      </div>
    </div>
  )
}
