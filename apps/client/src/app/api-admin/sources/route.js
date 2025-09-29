import { NextResponse } from 'next/server'
import { getAllSources } from '@headlines/data-access'
import { createApiHandler } from '@/lib/api-handler'

const handleGet = async (request) => {
  const { searchParams } = new URL(request.url)
  const country = searchParams.get('country') // Get the country from the query string

  // Pass the filter to the data-access function
  const result = await getAllSources({ country: country || null })

  if (!result.success) throw new Error(result.error)

  return NextResponse.json(result)
}

export const GET = createApiHandler(handleGet)
export const dynamic = 'force-dynamic'
