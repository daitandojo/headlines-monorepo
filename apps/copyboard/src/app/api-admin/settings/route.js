import { NextResponse } from 'next/server'
import { getSettings, updateSettings } from '@headlines/data-access'
import { createApiHandler } from '@/lib/api-handler'

const handleGet = async (request) => {
  const result = await getSettings()
  if (!result.success) {
    throw new Error(result.error)
  }
  return NextResponse.json(result)
}

const handlePatch = async (request) => {
  const updatedSettings = await request.json()
  const result = await updateSettings(updatedSettings)
  if (!result.success) {
    throw new Error(result.error)
  }
  return NextResponse.json(result)
}

export const GET = createApiHandler(handleGet)
export const PATCH = createApiHandler(handlePatch)
export const dynamic = 'force-dynamic'
