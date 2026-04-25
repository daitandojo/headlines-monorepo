// apps/client/src/app/api/pipeline/live/route.js
'use server'

import { NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/auth/server'

const SERVER_URL = process.env.PIPELINE_SERVER_URL || 'http://localhost:3002'

const handleGet = async (request) => {
  const { isAdmin, error } = await verifyAdmin()
  if (!isAdmin) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const runId = searchParams.get('runId')
  const endpoint = searchParams.get('endpoint') || 'stream'

  if (!runId && endpoint === 'stream') {
    return NextResponse.json({ error: 'runId is required.' }, { status: 400 })
  }

  const { data, status } = await (async () => {
    const url = `${SERVER_URL}/api/pipeline/live/${endpoint}${endpoint === 'stream' ? `?runId=${runId}` : `?runId=${runId}`}`
    const res = await fetch(url)
    const json = await res.json()
    return { status: res.status, data: json }
  })()

  return NextResponse.json(data)
}

export const GET = handleGet