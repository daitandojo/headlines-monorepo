import { NextResponse } from 'next/server'
import { getArticles } from '@headlines/data-access'
import { createApiHandler } from '@/lib/api-handler'
import dbConnect from '@headlines/data-access/dbConnect.js' // Import dbConnect

const handleGet = async (request, { user }) => {
  // --- START OF THE FIX ---
  // Establish the database connection for this serverless request.
  await dbConnect()
  // --- END OF THE FIX ---

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1', 10)
  const sort = searchParams.get('sort')
  const columnFilters = JSON.parse(searchParams.get('columnFilters') || '[]')

  const filters = columnFilters.reduce((acc, filter) => {
    if (filter.value) {
      const key = filter.id === 'headline' ? 'q' : filter.id
      acc[key] = filter.value
    }
    return acc
  }, {})

  const result = await getArticles({ page, filters, sort, userId: user.userId })
  if (!result.success) throw new Error(result.error)

  return NextResponse.json(result)
}

export const GET = createApiHandler(handleGet)
export const dynamic = 'force-dynamic'
