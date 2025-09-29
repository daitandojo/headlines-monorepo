// File: apps/copyboard/src/app/api-admin/subscribers/route.js (version 2.1 - Directive Removed)
import { NextResponse } from 'next/server'
import { getAllSubscribers, createSubscriber } from '@headlines/data-access/next'
import { createApiHandler } from '@/lib/api-handler'

// 'use server'; // <--- THIS LINE HAS BEEN REMOVED.

const handleGet = async (request) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1', 10)
  const sort = searchParams.get('sort') || 'createdAt_desc'
  const columnFilters = JSON.parse(searchParams.get('columnFilters') || '[]')

  const filters = columnFilters.reduce((acc, filter) => {
    if (filter.value) {
      const key = filter.id === 'email' ? 'q' : filter.id
      acc[key] = filter.value
    }
    return acc
  }, {})

  const result = await getAllSubscribers({ page, sort, filters })
  if (!result.success) throw new Error(result.error)

  return NextResponse.json(result)
}

const handlePost = async (request) => {
  const body = await request.json()
  const result = await createSubscriber(body)
  if (!result.success) {
    const status = result.error.includes('already exists') ? 409 : 500
    return NextResponse.json({ error: result.error }, { status })
  }
  return NextResponse.json(
    { success: true, subscriber: result.subscriber },
    { status: 201 }
  )
}

export const GET = createApiHandler(handleGet)
export const POST = createApiHandler(handlePost)
export const dynamic = 'force-dynamic'
