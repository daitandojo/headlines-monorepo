// packages/ui/src/data-table.jsx (version 3.0.0 - Horizontal Scroll Fix)
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
} from './components/table'
import { Input } from './components/input'
import { Button } from './components/button'
import { Checkbox } from './components/checkbox'
import { LoadingOverlay } from './LoadingOverlay'
import { ScrollArea } from './components/scroll-area'

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
    size: 40, // Give selection a small fixed size
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
  })

  useEffect(() => {
    if (onRowSelectionChange) {
      onRowSelectionChange(
        table.getSelectedRowModel().flatRows.map((row) => row.original)
      )
    }
  }, [rowSelection, onRowSelectionChange, table])

  const handleGlobalFilterChange = (value) => {
    const currentGlobalFilter = columnFilters.find((f) => f.id === 'headline')
    let newFilters = columnFilters.filter((f) => f.id !== 'headline')
    if (value) {
      newFilters.push({ id: 'headline', value })
    }
    setColumnFilters(newFilters)
  }

  const globalFilterValue = columnFilters.find((f) => f.id === 'headline')?.value || ''

  return (
    <div className="relative isolate flex flex-col h-full">
      <LoadingOverlay isLoading={isLoading && !(data?.length > 0)} />
      <div className="flex-shrink-0 flex items-center justify-between py-4">
        <Input
          placeholder="Filter by headline, source..."
          value={globalFilterValue}
          onChange={(event) => handleGlobalFilterChange(event.target.value)}
          className="max-w-sm"
        />
        <div className="flex items-center justify-end space-x-2">
          <span className="text-sm text-muted-foreground">
            Page {page} of {pageCount}
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
      {/* DEFINITIVE FIX: Add a wrapping div with overflow-auto to handle horizontal scrolling */}
      <div className="flex-grow overflow-auto rounded-md border">
        <Table>
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
