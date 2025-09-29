'use client'

import {
  PageHeader,
  DataTable,
  ConfirmationDialog,
  ExportButton,
} from '@/components/shared'
import { columns } from './columns'
import { useEntityManager } from '@/hooks/use-entity-manager'
import { toast } from 'sonner'
import { useCallback, useMemo, useState } from 'react'
import { updateArticleAction, deleteArticleAction } from './actions'
import { handleExport } from '@/lib/api-client'

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
  } = useEntityManager('articles')

  const [confirmState, setConfirmState] = useState({ isOpen: false, articleId: null })

  const handleUpdate = useCallback(
    async (article, updateData) => {
      setData((currentData) =>
        currentData.map((a) => (a._id === article._id ? { ...a, ...updateData } : a))
      )

      const result = await updateArticleAction(article._id, updateData)
      if (!result.success) {
        toast.error(`Update failed: ${result.error}. Reverting.`)
        refetch()
      }
    },
    [setData, refetch]
  )

  const handleDeleteRequest = useCallback((articleId) => {
    setConfirmState({ isOpen: true, articleId })
  }, [])

  const confirmDelete = useCallback(async () => {
    const { articleId } = confirmState
    setConfirmState({ isOpen: false, articleId: null })
    const toastId = toast.loading('Deleting article...')

    const result = await deleteArticleAction(articleId)
    if (result.success) {
      toast.success('Article deleted.', { id: toastId })
      refetch()
    } else {
      toast.error(`Deletion failed: ${result.error}`, { id: toastId })
    }
  }, [confirmState, refetch])

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
          <ExportButton hasData={data && data.length > 0} onExport={onExport} />
        </PageHeader>
        <div className="mt-8 flex-grow min-h-0">
          <DataTable
            columns={tableColumns}
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
