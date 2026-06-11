// apps/client/src/app/api/pipeline/live/route.js
'use server'

import { NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/auth/server'

const SERVER_URL = process.env.PIPELINE_SERVER_URL || 'http://localhost:3002'
const JWT_COOKIE_NAME = 'headlines-jwt'

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

  const serverUrl = `${SERVER_URL}/api/pipeline/live/${endpoint}?runId=${runId}`
  const jwtToken = request.cookies.get(JWT_COOKIE_NAME)?.value
  const headers = jwtToken ? { Authorization: `Bearer ${jwtToken}` } : {}

  if (endpoint === 'stream') {
    const upstream = await fetch(serverUrl, { headers })
    if (!upstream.ok) {
      return NextResponse.json({ error: 'Failed to connect to pipeline server' }, { status: 502 })
    }
    const { readable, writable } = new TransformStream()
    upstream.body.pipeTo(writable)
    return new NextResponse(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  }

  const res = await fetch(serverUrl, { headers })
  const data = await res.json()
  return NextResponse.json(data)
}

export const GET = handleGet