// packages/ui/src/data-table.jsx (version 3.1.0 - Fully Controlled & Responsive)
'use client'

import React, { useState, useEffect } from 'react'
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
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
} from './elements'
import { LoadingOverlay } from './LoadingOverlay'

const addSelectionColumn = (columns) => [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 40,
  },
  ...columns,
]

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
  enableColumnResizing,
  tableProps,
}) {
  const [rowSelection, setRowSelection] = useState({})

  const tableColumns = React.useMemo(
    () => (enableRowSelection ? addSelectionColumn(columns) : columns),
    [enableRowSelection, columns]
  )

  const pageCount = total ? Math.ceil(total / 50) : 0

  const table = useReactTable({
    data: data || [],
    columns: tableColumns,
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
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    enableColumnResizing,
  })

  useEffect(() => {
    if (onRowSelectionChange) {
      onRowSelectionChange(
        table.getSelectedRowModel().flatRows.map((row) => row.original)
      )
    }
  }, [rowSelection, onRowSelectionChange, table])

  const handleFilterChange = (value) => {
    if (!filterColumn) return
    const currentFilter = columnFilters.find((f) => f.id === filterColumn)
    let newFilters = columnFilters.filter((f) => f.id !== filterColumn)
    if (value) {
      newFilters.push({ id: filterColumn, value })
    }
    setColumnFilters(newFilters)
  }

  const filterValue = columnFilters.find((f) => f.id === filterColumn)?.value || ''

  return (
    <div className="relative isolate flex flex-col h-full">
      <LoadingOverlay isLoading={isLoading && !(data?.length > 0)} />
      <div className="flex-shrink-0 flex items-center justify-between py-4">
        {filterColumn && (
          <Input
            placeholder={filterPlaceholder}
            value={filterValue}
            onChange={(event) => handleFilterChange(event.target.value)}
            className="max-w-sm"
          />
        )}
        <div className="flex items-center justify-end space-x-2">
          <span className="text-sm text-muted-foreground">
            Page {page} of {pageCount || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p - 1)}
            disabled={page <= 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= pageCount}
          >
            Next
          </Button>
        </div>
      </div>
      <div className="flex-grow rounded-md border overflow-auto">
        <Table {...tableProps}>
          <TableHeader className="sticky top-0 bg-background z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{
                      width:
                        header.getSize() !== 150 ? `${header.getSize()}px` : undefined,
                    }}
                  >
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
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={tableColumns.length} className="h-24 text-center">
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
