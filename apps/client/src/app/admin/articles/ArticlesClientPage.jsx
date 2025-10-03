// apps/client/src/app/admin/articles/ArticlesClientPage.jsx
'use client'

import { useState, useCallback, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  PageHeader,
  DataTable,
  ConfirmationDialog,
  ExportButton,
} from '@/components/shared'
import { columns } from './columns'
import { updateArticleAction, deleteArticleAction } from './actions'
import { handleExport } from '@/lib/api-client'

export default function ArticlesClientPage({ initialArticles, total }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const page = parseInt(searchParams.get('page') || '1', 10)
  const sortParam = searchParams.get('sort') || ''
  const filterParam = searchParams.get('filters') || '[]'

  const [sorting, setSorting] = useState(
    sortParam
      ? [{ id: sortParam.split('_')[0], desc: sortParam.split('_')[1] === 'desc' }]
      : []
  )
  const [columnFilters, setColumnFilters] = useState(JSON.parse(filterParam))
  const [confirmState, setConfirmState] = useState({ isOpen: false, articleId: null })

  const updateUrlParams = useCallback(
    ({ page, sorting, filters }) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('page', page.toString())
      if (sorting?.length > 0) {
        params.set('sort', `${sorting[0].id}_${sorting[0].desc ? 'desc' : 'asc'}`)
      } else {
        params.delete('sort')
      }
      if (filters?.length > 0) {
        params.set('filters', JSON.stringify(filters))
      } else {
        params.delete('filters')
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  const handlePageChange = (newPage) =>
    updateUrlParams({ page: newPage, sorting, filters: columnFilters })
  const handleSortChange = (newSorting) =>
    updateUrlParams({ page: 1, sorting: newSorting, filters: columnFilters })
  const handleFilterChange = (newFilters) =>
    updateUrlParams({ page: 1, sorting, filters: newFilters })

  const handleUpdate = useCallback(async (article, updateData) => {
    toast.promise(updateArticleAction(article._id, updateData), {
      loading: 'Updating article...',
      success: 'Article updated successfully.',
      error: (err) => `Update failed: ${err.message}`,
    })
  }, [])

  const handleDeleteRequest = useCallback((articleId) => {
    setConfirmState({ isOpen: true, articleId })
  }, [])

  const confirmDelete = useCallback(async () => {
    const { articleId } = confirmState
    setConfirmState({ isOpen: false, articleId: null })

    toast.promise(deleteArticleAction(articleId), {
      loading: 'Deleting article...',
      success: 'Article deleted.',
      error: (err) => `Deletion failed: ${err.message}`,
    })
  }, [confirmState])

  const tableColumns = useMemo(
    () => columns(handleUpdate, handleDeleteRequest),
    [handleUpdate, handleDeleteRequest]
  )

  const onExport = (fileType) => {
    const sort = sorting[0]
      ? `${sorting[0].id}_${sorting[0].desc ? 'desc' : 'asc'}`
      : null
    return handleExport('articles', fileType, columnFilters, sort)
  }

  return (
    <>
      <div className="flex flex-col h-full">
        <PageHeader
          title="Article Management"
          description={`Review and manage all ${total.toLocaleString()} raw articles.`}
        >
          <ExportButton
            hasData={initialArticles && initialArticles.length > 0}
            onExport={onExport}
          />
        </PageHeader>
        <div className="mt-8 flex-grow min-h-0">
          <DataTable
            columns={tableColumns}
            data={initialArticles}
            page={page}
            setPage={handlePageChange}
            total={total}
            sorting={sorting}
            setSorting={handleSortChange}
            columnFilters={columnFilters}
            setColumnFilters={handleFilterChange}
            filterColumn="headline"
            filterPlaceholder="Filter by headline..."
          />
        </div>
      </div>
      <ConfirmationDialog
        open={confirmState.isOpen}
        onOpenChange={(isOpen) => setConfirmState({ ...confirmState, isOpen })}
        onConfirm={confirmDelete}
        title="Confirm Deletion"
        description="Are you sure you want to permanently delete this article?"
        confirmText="Delete Article"
      />
    </>
  )
}
