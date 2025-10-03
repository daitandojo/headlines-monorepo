// apps/client/src/components/shared/data-table.jsx
'use client'

import React, { useState, useEffect } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Input,
  Button,
  Checkbox,
} from '../elements'
import { LoadingOverlay } from '../screen/LoadingOverlay'
import { useDebounce } from '@/hooks'

export function DataTable({
  columns,
  data,
  isLoading,
  page,
  setPage,
  total,
  sorting,
  setSorting,
  columnFilters = [],
  setColumnFilters = () => {},
  enableRowSelection = false,
  onRowSelectionChange,
  filterColumn,
  filterPlaceholder,
}) {
  const [rowSelection, setRowSelection] = useState({})
  const [localFilter, setLocalFilter] = useState(
    columnFilters.find((f) => f.id === filterColumn)?.value || ''
  )
  const debouncedFilter = useDebounce(localFilter, 500)

  const pageCount = total ? Math.ceil(total / 50) : 1

  const table = useReactTable({
    data: data || [],
    columns,
    pageCount,
    state: {
      sorting,
      columnFilters,
      rowSelection,
      pagination: {
        pageIndex: page - 1,
        pageSize: 50,
      },
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
  })

  useEffect(() => {
    if (onRowSelectionChange) {
      onRowSelectionChange(
        table.getSelectedRowModel().flatRows.map((row) => row.original)
      )
    }
  }, [rowSelection, onRowSelectionChange, table])

  useEffect(() => {
    if (filterColumn) {
      const newFilters = debouncedFilter
        ? [{ id: filterColumn, value: debouncedFilter }]
        : []
      setColumnFilters(newFilters)
    }
  }, [debouncedFilter, filterColumn, setColumnFilters])

  return (
    <div className="relative isolate flex flex-col h-full">
      <LoadingOverlay isLoading={isLoading && !(data?.length > 0)} />
      <div className="flex-shrink-0 flex items-center justify-between py-4">
        {filterColumn && (
          <Input
            placeholder={filterPlaceholder}
            value={localFilter}
            onChange={(event) => setLocalFilter(event.target.value)}
            className="max-w-sm"
          />
        )}

        {pageCount > 1 && (
          <div className="flex items-center justify-end space-x-2">
            <span className="text-sm text-muted-foreground">
              Page {page} of {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page >= pageCount}
            >
              Next
            </Button>
          </div>
        )}
      </div>
      <div className="flex-grow rounded-md border overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} style={{ width: header.getSize() }}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} style={{ width: cell.column.getSize() }}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {isLoading ? 'Loading...' : 'No results.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
