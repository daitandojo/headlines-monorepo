import { NextResponse } from 'next/server'
import { getAllCountries } from '@headlines/data-access'
import { createApiHandler } from '@/lib/api-handler'

const handleGet = async (request) => {
  const result = await getAllCountries()
  if (!result.success) throw new Error(result.error)

  return NextResponse.json(result)
}

export const GET = createApiHandler(handleGet)
export const dynamic = 'force-dynamic'
