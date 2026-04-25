// apps/client/src/app/api/file-ingestion/route.js
'use server'

import { NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/auth/server'

const SERVER_URL = process.env.PIPELINE_SERVER_URL || 'http://localhost:3002'

const handlePost = async (request) => {
  const { isAdmin, error } = await verifyAdmin()
  if (!isAdmin) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file')

  if (!file) {
    return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 })
  }

  const options = {
    dryRun: formData.get('dryRun') === 'true',
    force: formData.get('force') === 'true',
    limit: formData.get('limit') || null,
  }

  const pipelineFormData = new FormData()
  pipelineFormData.append('file', file)
  if (options.dryRun) pipelineFormData.append('dryRun', 'true')
  if (options.force) pipelineFormData.append('force', 'true')
  if (options.limit) pipelineFormData.append('limit', options.limit)

  try {
    const response = await fetch(`${SERVER_URL}/api/file-ingestion`, {
      method: 'POST',
      body: pipelineFormData,
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({ error: data.error || 'File ingestion failed.' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: `Could not reach pipeline server: ${error.message}` },
      { status: 502 },
    )
  }
}

export const POST = handlePost