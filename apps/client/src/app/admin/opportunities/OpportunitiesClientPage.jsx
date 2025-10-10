// apps/client/src/app/admin/opportunities/OpportunitiesClientPage.jsx
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
import { updateOpportunityAction, deleteOpportunityAction } from './actions'
import { handleExport } from '@/lib/api-client'
import { useQueryClient } from '@tanstack/react-query'

const QUERY_KEY = 'adminOpportunities'
const API_ENDPOINT = 'opportunities'

export default function OpportunitiesClientPage() {
  const queryClient = useQueryClient()
  const [confirmState, setConfirmState] = useState({ isOpen: false, opportunityId: null })

  const invalidateData = () => queryClient.invalidateQueries({ queryKey: [API_ENDPOINT] })

  const handleUpdate = useCallback(
    async (opportunity, updateData) => {
      toast.promise(updateOpportunityAction(opportunity._id, updateData), {
        loading: 'Updating opportunity...',
        success: () => {
          invalidateData()
          return 'Opportunity updated successfully.'
        },
        error: (err) => `Update failed: ${err.message}`,
      })
    },
    [invalidateData]
  )

  const handleDeleteRequest = useCallback((opportunityId) => {
    setConfirmState({ isOpen: true, opportunityId })
  }, [])

  const confirmDelete = useCallback(async () => {
    const { opportunityId } = confirmState
    setConfirmState({ isOpen: false, opportunityId: null })
    toast.promise(deleteOpportunityAction(opportunityId), {
      loading: 'Deleting opportunity...',
      success: () => {
        invalidateData()
        return 'Opportunity deleted.'
      },
      error: (err) => `Deletion failed: ${err.message}`,
    })
  }, [confirmState, invalidateData])

  const tableColumns = useMemo(
    () => columns(handleUpdate, handleDeleteRequest),
    [handleUpdate, handleDeleteRequest]
  )

  const onExport = (fileType) => {
    return handleExport(API_ENDPOINT, fileType, [], null)
  }

  return (
    <>
      <div className="flex flex-col h-full">
        <PageHeader
          title="Opportunity Management"
          description="Review and manage all actionable opportunities."
        >
          <ExportButton hasData={true} onExport={onExport} />
        </PageHeader>
        <div className="mt-8 flex-grow min-h-0">
          <DataTable
            columns={tableColumns}
            apiEndpoint={API_ENDPOINT}
            queryKey={QUERY_KEY}
            filterColumn="reachOutTo"
            filterPlaceholder="Filter by name, company..."
          />
        </div>
      </div>
      <ConfirmationDialog
        open={confirmState.isOpen}
        onOpenChange={(isOpen) => setConfirmState({ ...confirmState, isOpen })}
        onConfirm={confirmDelete}
        title="Confirm Deletion"
        description="Are you sure you want to permanently delete this opportunity?"
        confirmText="Delete Opportunity"
      />
    </>
  )
}
