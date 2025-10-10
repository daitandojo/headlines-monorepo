// apps/client/src/app/admin/articles/ArticlesClientPage.jsx
'use client'

import { useState, useCallback, useMemo } from 'react'
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
import { useQueryClient } from '@tanstack/react-query'

const QUERY_KEY = 'adminArticles'
const API_ENDPOINT = 'articles'

export default function ArticlesClientPage() {
  const queryClient = useQueryClient()
  const [confirmState, setConfirmState] = useState({ isOpen: false, articleId: null })

  const invalidateData = () => queryClient.invalidateQueries({ queryKey: [API_ENDPOINT] })

  const handleUpdate = useCallback(
    async (article, updateData) => {
      toast.promise(updateArticleAction(article._id, updateData), {
        loading: 'Updating article...',
        success: () => {
          invalidateData()
          return 'Article updated successfully.'
        },
        error: (err) => `Update failed: ${err.message}`,
      })
    },
    [invalidateData]
  )

  const handleDeleteRequest = useCallback((articleId) => {
    setConfirmState({ isOpen: true, articleId })
  }, [])

  const confirmDelete = useCallback(async () => {
    const { articleId } = confirmState
    setConfirmState({ isOpen: false, articleId: null })

    toast.promise(deleteArticleAction(articleId), {
      loading: 'Deleting article...',
      success: () => {
        invalidateData()
        return 'Article deleted.'
      },
      error: (err) => `Deletion failed: ${err.message}`,
    })
  }, [confirmState, invalidateData])

  const tableColumns = useMemo(
    () => columns(handleUpdate, handleDeleteRequest),
    [handleUpdate, handleDeleteRequest]
  )

  const onExport = (fileType) => {
    // Export logic can remain, it might need slight tweaks based on how you get sort/filter state
    // For now, this is a reasonable simplification.
    return handleExport(API_ENDPOINT, fileType, [], null)
  }

  return (
    <>
      <div className="flex flex-col h-full">
        <PageHeader
          title="Article Management"
          description="Review and manage all raw articles."
        >
          <ExportButton hasData={true} onExport={onExport} />
        </PageHeader>
        <div className="mt-8 flex-grow min-h-0">
          <DataTable
            columns={tableColumns}
            apiEndpoint={API_ENDPOINT}
            queryKey={QUERY_KEY}
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
