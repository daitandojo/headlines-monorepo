// apps/client/src/components/shared/tables/data-table.jsx
'use client'

import React, { useState, useMemo, useEffect } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
} from '@tanstack/react-table'
import { useQuery } from '@tanstack/react-query'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Input,
  Button,
} from '../elements'
import { LoadingOverlay } from '../screen/LoadingOverlay'
import { useDebounce } from '@/hooks'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'

async function fetchAdminData({ queryKey }) {
  const [apiEndpoint, params] = queryKey
  const urlParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      // Stringify filters object
      const paramValue = typeof value === 'object' ? JSON.stringify(value) : String(value)
      urlParams.set(key, paramValue)
    }
  })

  const res = await fetch(`/api-admin/${apiEndpoint}?${urlParams.toString()}`)
  if (!res.ok) {
    const errorData = await res.json()
    throw new Error(errorData.error || 'Network response was not ok')
  }
  return res.json()
}

export function DataTable({
  columns,
  apiEndpoint,
  queryKey,
  filterColumn,
  filterPlaceholder,
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const page = parseInt(searchParams.get('page') || '1', 10)
  const sortParam = searchParams.get('sort') || null
  const filterParam = searchParams.get('filters') || '[]'

  const [sorting, setSorting] = useState(
    sortParam
      ? [{ id: sortParam.split('_')[0], desc: sortParam.split('_')[1] === 'desc' }]
      : []
  )
  const [columnFilters, setColumnFilters] = useState(JSON.parse(filterParam))
  const [localFilter, setLocalFilter] = useState(
    JSON.parse(filterParam).find((f) => f.id === filterColumn)?.value || ''
  )
  const debouncedFilter = useDebounce(localFilter, 500)

  useEffect(() => {
    const newFilters = debouncedFilter
      ? [{ id: filterColumn, value: debouncedFilter }]
      : []
    setColumnFilters(newFilters)
  }, [debouncedFilter, filterColumn])

  const memoizedQueryConfig = useMemo(() => {
    const sort =
      sorting.length > 0 ? `${sorting[0].id}_${sorting[0].desc ? 'desc' : 'asc'}` : null
    return { page, sort, filters: JSON.stringify(columnFilters) }
  }, [page, sorting, columnFilters])

  const { data, isLoading, isError, error } = useQuery({
    queryKey: [apiEndpoint, memoizedQueryConfig],
    queryFn: fetchAdminData,
    placeholderData: (previousData) => previousData,
  })

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(page))
    if (sorting.length > 0) {
      params.set('sort', `${sorting[0].id}_${sorting[0].desc ? 'desc' : 'asc'}`)
    } else {
      params.delete('sort')
    }
    params.set('filters', JSON.stringify(columnFilters))
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [page, sorting, columnFilters, pathname, router, searchParams])

  const setPage = (updater) => {
    const newPageIndex = typeof updater === 'function' ? updater(page - 1) : updater
    router.push(`${pathname}?page=${newPageIndex + 1}`, { scroll: false })
  }

  const tableData = useMemo(() => data?.data ?? [], [data])
  const pageCount = useMemo(() => (data?.total ? Math.ceil(data.total / 50) : 1), [data])

  const table = useReactTable({
    data: tableData,
    columns,
    pageCount,
    state: {
      sorting,
      columnFilters,
      pagination: {
        pageIndex: page - 1,
        pageSize: 50,
      },
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
  })

  return (
    <div className="relative isolate flex flex-col h-full">
      <LoadingOverlay isLoading={isLoading && tableData.length === 0} />
      <div className="flex-shrink-0 flex items-center justify-between py-4">
        {filterColumn && (
          <Input
            placeholder={filterPlaceholder}
            value={localFilter}
            onChange={(event) => setLocalFilter(event.target.value)}
            className="max-w-sm"
          />
        )}
        <div className="flex items-center justify-end space-x-2">
          <span className="text-sm text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
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
            {isError ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-red-500"
                >
                  Error fetching data: {error.message}
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
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
