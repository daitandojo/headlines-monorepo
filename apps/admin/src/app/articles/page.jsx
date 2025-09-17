// apps/admin/src/app/articles/page.jsx (version 1.2.0)
'use client'

import { PageHeader, DataTable, ExportButton } from '@headlines/ui'
import { columns } from './columns'
import { useAdminManager } from '@/hooks/use-admin-manager'
import {
  deleteAdminArticle,
  updateAdminArticle,
  exportArticlesToCSV,
  exportArticlesToXLSX,
} from '@headlines/data-access'
import { toast } from 'sonner'
import { useCallback, useState } from 'react'

export default function ArticlesPage() {
  const [sorting, setSorting] = useState([{ id: 'createdAt', desc: true }])
  const [columnFilters, setColumnFilters] = useState([])
  const [page, setPage] = useState(1)

  const { data, setData, total, isLoading, refetch } = useAdminManager(
    '/api/articles',
    page,
    sorting,
    columnFilters
  )

  const handleDelete = useCallback(
    async (articleId) => {
      setData((currentData) => currentData.filter((a) => a._id !== articleId))
      toast.success('Article deleted.')
      const result = await deleteAdminArticle(articleId)
      if (!result.success) {
        toast.error(`Deletion failed on server: ${result.error}. Reverting.`)
        refetch()
      }
    },
    [setData, refetch]
  )

  const handleOptimisticUpdate = useCallback(
    async (article, updateData) => {
      setData((currentData) =>
        currentData.map((a) => (a._id === article._id ? { ...a, ...updateData } : a))
      )
      const result = await updateAdminArticle(article._id, updateData)
      if (!result.success) {
        toast.error(`Update failed: ${result.error}`)
        refetch()
      }
    },
    [setData, refetch]
  )

  const description = `Review and manage all ${data.length.toLocaleString()} visible articles (${total.toLocaleString()} total).`

  const currentFilters = columnFilters.reduce((acc, filter) => {
    acc[filter.id === 'headline' ? 'q' : filter.id] = filter.value
    return acc
  }, {})
  const sortParam = sorting[0]
    ? `${sorting[0].id}_${sorting[0].desc ? 'desc' : 'asc'}`
    : 'createdAt_desc'

  const exportActions = {
    csv: () => exportArticlesToCSV({ filters: currentFilters, sort: sortParam }),
    xlsx: () => exportArticlesToXLSX({ filters: currentFilters, sort: sortParam }),
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Article Management" description={description}>
        <ExportButton
          hasData={data && data.length > 0}
          filename="articles_export"
          exportActions={exportActions}
        />
      </PageHeader>
      <div className="mt-8 flex-grow min-h-0 max-w-none">
        <DataTable
          columns={columns(handleOptimisticUpdate, handleDelete)}
          data={data}
          isLoading={isLoading}
          // DEFINITIVE FIX: Pass the required pagination props to the DataTable component.
          page={page}
          setPage={setPage}
          total={total}
          sorting={sorting}
          setSorting={setSorting}
          columnFilters={columnFilters}
          setColumnFilters={setColumnFilters}
        />
      </div>
    </div>
  )
}
