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
import { updateOpportunityAction, deleteOpportunityAction } from './actions'
import { handleExport } from '@/lib/api-client'

export default function OpportunitiesPage() {
  const {
    data: opportunities,
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
  } = useEntityManager('opportunities')

  const [confirmState, setConfirmState] = useState({ isOpen: false, opportunityId: null })

  const handleUpdate = useCallback(
    async (opportunity, updateData) => {
      setData((currentData) =>
        currentData.map((o) => (o._id === opportunity._id ? { ...o, ...updateData } : o))
      )

      const result = await updateOpportunityAction(opportunity._id, updateData)
      if (!result.success) {
        toast.error(`Update failed: ${result.error}. Reverting.`)
        refetch()
      }
    },
    [setData, refetch]
  )

  const handleDeleteRequest = useCallback((opportunityId) => {
    setConfirmState({ isOpen: true, opportunityId })
  }, [])

  const confirmDelete = useCallback(async () => {
    const { opportunityId } = confirmState
    setConfirmState({ isOpen: false, opportunityId: null })
    const toastId = toast.loading('Deleting opportunity...')

    const result = await deleteOpportunityAction(opportunityId)
    if (result.success) {
      toast.success('Opportunity deleted.', { id: toastId })
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
    return handleExport('opportunities', fileType, columnFilters, sort)
  }

  return (
    <>
      <div className="flex flex-col h-full">
        <PageHeader
          title="Opportunity Management"
          description={`Review and manage all ${total.toLocaleString()} actionable opportunities.`}
        >
          <ExportButton
            hasData={opportunities && opportunities.length > 0}
            onExport={onExport}
          />
        </PageHeader>
        <div className="mt-8 flex-grow min-h-0">
          <DataTable
            columns={tableColumns}
            data={opportunities}
            isLoading={isLoading}
            page={page}
            setPage={setPage}
            total={total}
            sorting={sorting}
            setSorting={setSorting}
            columnFilters={columnFilters}
            setColumnFilters={setColumnFilters}
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
