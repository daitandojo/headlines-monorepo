// apps/client/src/app/api/pipeline/run/route.js
'use server'

import { NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/auth/server'

const SERVER_URL = process.env.PIPELINE_SERVER_URL || 'http://localhost:3002'

async function proxyToServer(endpoint, method, body) {
  const url = `${SERVER_URL}${endpoint}`
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }
  if (body) options.body = JSON.stringify(body)

  const res = await fetch(url, options)
  const data = await res.json()
  return { status: res.status, data }
}

const handlePost = async (request) => {
  const { isAdmin, error } = await verifyAdmin()
  if (!isAdmin) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { data, status } = await proxyToServer('/api/pipeline/run/start', 'POST', body)

  if (status !== 202) {
    return NextResponse.json({ error: data.error || 'Failed to start pipeline.' }, { status: status })
  }

  return NextResponse.json(data)
}

const handleGet = async (request) => {
  const { isAdmin, error } = await verifyAdmin()
  if (!isAdmin) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
  }

  const { data, status } = await proxyToServer('/api/pipeline/run/status', 'GET')
  return NextResponse.json(data)
}

export const POST = handlePost
export const GET = handleGet