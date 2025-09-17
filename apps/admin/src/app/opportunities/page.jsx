// apps/admin/src/app/opportunities/page.jsx (version 3.2.0 - Simplified Layout)
'use client'

import { useMemo, useState, useCallback } from 'react'
import {
  PageHeader,
  DataTable,
  ExportButton,
  ConfirmationDialog,
} from '@headlines/ui/src/index.js'
import { columns } from './columns'
import { useAdminManager } from '@/hooks/use-admin-manager'
import {
  deleteAdminOpportunity,
  updateAdminOpportunity,
  exportOpportunitiesToCSV,
  exportOpportunitiesToXLSX,
} from '@headlines/data-access/src/index.js'
import { toast } from 'sonner'

export default function OpportunitiesPage() {
  const [sorting, setSorting] = useState([{ id: 'createdAt', desc: true }])
  const [columnFilters, setColumnFilters] = useState([])
  const [page, setPage] = useState(1)

  const { data, setData, total, isLoading, refetch } = useAdminManager(
    '/api/opportunities',
    page,
    sorting,
    columnFilters
  )

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
      const result = await updateAdminOpportunity(opp._id, updateData)
      if (!result.success) {
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
    if (!confirmState.oppId) return

    const { oppId, oppName } = confirmState
    setConfirmState({ isOpen: false, oppId: null, oppName: '' })

    setData((currentData) => currentData.filter((o) => o._id !== oppId))
    toast.success(`Opportunity for "${oppName}" deleted.`)

    const result = await deleteAdminOpportunity(oppId)
    if (!result.success) {
      toast.error(`Deletion failed on server: ${result.error}. Reverting.`)
      refetch()
    }
  }, [confirmState, setData, refetch])

  const handleEdit = useCallback((oppId) => {
    toast.info('Full editor for this view is coming soon.')
  }, [])

  const tableColumns = useMemo(
    () => columns(handleUpdate, handleDeleteRequest, handleEdit),
    [handleUpdate, handleDeleteRequest, handleEdit]
  )

  const description = `Review and manage all ${data.length.toLocaleString()} visible opportunities (${total.toLocaleString()} total).`

  const currentFilters = columnFilters.reduce((acc, filter) => {
    acc[filter.id === 'reachOutTo' ? 'q' : filter.id] = filter.value
    return acc
  }, {})
  const sortParam = sorting[0]
    ? `${sorting[0].id}_${sorting[0].desc ? 'desc' : 'asc'}`
    : 'createdAt_desc'

  const exportActions = {
    csv: () => exportOpportunitiesToCSV({ filters: currentFilters, sort: sortParam }),
    xlsx: () => exportOpportunitiesToXLSX({ filters: currentFilters, sort: sortParam }),
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
          {/* DEFINITIVE FIX: The manual wrappers are gone. The DataTable is now fully controlled and self-contained. */}
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
            enableColumnResizing={false}
            filterColumn="reachOutTo"
            filterPlaceholder="Filter by name..."
            tableProps={{ style: { tableLayout: 'fixed', minWidth: '850px' } }}
          />
        </div>
      </div>
      <ConfirmationDialog
        open={confirmState.isOpen}
        onOpenChange={(isOpen) => setConfirmState({ ...confirmState, isOpen })}
        onConfirm={confirmDelete}
        title="Confirm Deletion"
        description={`Are you sure you want to permanently delete the opportunity for "${confirmState.oppName}"? This action cannot be undone.`}
        confirmText="Delete Opportunity"
      />
    </>
  )
}
