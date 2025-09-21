// apps/admin/src/app/api/events/route.js (version 3.0.1)
import { NextResponse } from 'next/server'
import { getEvents } from '@headlines/data-access'
import { createApiHandler } from '@/lib/api-handler'

const handleGet = async (request) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1', 10)
  const sort = searchParams.get('sort') || 'createdAt_desc'
  const columnFilters = JSON.parse(searchParams.get('columnFilters') || '[]')
  const filters = columnFilters.reduce((acc, filter) => {
    if (filter.value) {
      const key = filter.id === 'synthesized_headline' ? 'q' : filter.id
      acc[key] = filter.value
    }
    return acc
  }, {})

  const result = await getEvents({ page, sort, filters })
  if (!result.success) throw new Error(result.error)
  return NextResponse.json(result)
}

export const GET = createApiHandler(handleGet)
export const dynamic = 'force-dynamic'
