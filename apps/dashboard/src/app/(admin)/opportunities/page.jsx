// apps/admin/src/app/(protected)/opportunities/page.jsx (version 5.0.1)
'use client'

import { useMemo, useState, useCallback } from 'react'
import {
  PageHeader,
  DataTable,
  ExportButton,
  ConfirmationDialog,
} from '@components/shared'
import { columns } from './columns'
import { useEntityManager } from '@/hooks/use-entity-manager'
import { toast } from 'sonner'
import { deleteOpportunity, updateOpportunity } from '@/lib/api-client'
import {
  exportOpportunitiesToCSV,
  exportOpportunitiesToXLSX,
} from '@headlines/data-access'
import { API_OPPORTUNITIES, QUERY_KEY_OPPORTUNITIES } from '@/lib/constants'

export default function OpportunitiesPage() {
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
  } = useEntityManager(API_OPPORTUNITIES, QUERY_KEY_OPPORTUNITIES, [
    { id: 'createdAt', desc: true },
  ])

  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    oppId: null,
    oppName: '',
  })

  const handleUpdate = useCallback(
    async (opp, updateData) => {
      setData((currentData) =>
        currentData.map((o) => (o._id === opp._id ? { ...o, ...updateData } : o))
      )
      const result = await updateOpportunity(opp._id, updateData)
      if (result.error) {
        toast.error(`Update failed: ${result.error}`)
        refetch()
      } else {
        toast.success(`Updated opportunity for ${opp.reachOutTo}`)
      }
    },
    [setData, refetch]
  )

  const handleDeleteRequest = useCallback((opp) => {
    setConfirmState({ isOpen: true, oppId: opp._id, oppName: opp.reachOutTo })
  }, [])

  const confirmDelete = useCallback(async () => {
    const { oppId, oppName } = confirmState
    setConfirmState({ isOpen: false, oppId: null, oppName: '' })
    const originalData = [...data]
    setData((currentData) => currentData.filter((o) => o._id !== oppId))
    const result = await deleteOpportunity(oppId)
    if (result.error) {
      toast.error(`Deletion failed: ${result.error}. Reverting.`)
      setData(originalData)
    } else {
      toast.success(`Opportunity for "${oppName}" deleted.`)
      refetch()
    }
  }, [confirmState, data, setData, refetch])

  const handleEdit = useCallback((oppId) => {
    toast.info('Full editor for this view is coming soon.')
  }, [])
  const tableColumns = useMemo(
    () => columns(handleUpdate, handleDeleteRequest, handleEdit),
    [handleUpdate, handleDeleteRequest, handleEdit]
  )
  const description = `Review and manage all ${total.toLocaleString()} actionable opportunities.`
  const sortParam = sorting[0]
    ? `${sorting[0].id}_${sorting[0].desc ? 'desc' : 'asc'}`
    : 'createdAt_desc'
  const exportActions = {
    csv: () => exportOpportunitiesToCSV({ filters: columnFilters, sort: sortParam }),
    xlsx: () => exportOpportunitiesToXLSX({ filters: columnFilters, sort: sortParam }),
  }

  return (
    <>
      <div className="flex flex-col h-full">
        <PageHeader title="Opportunity Management" description={description}>
          <ExportButton
            hasData={data && data.length > 0}
            filename="opportunities_export"
            exportActions={exportActions}
          />
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
            filterColumn="reachOutTo"
            filterPlaceholder="Filter by name..."
          />
        </div>
      </div>
      <ConfirmationDialog
        open={confirmState.isOpen}
        onOpenChange={(isOpen) => setConfirmState({ ...confirmState, isOpen })}
        onConfirm={confirmDelete}
        title="Confirm Deletion"
        description={`Are you sure you want to permanently delete the opportunity for "${confirmState.oppName}"?`}
        confirmText="Delete Opportunity"
      />
    </>
  )
}
