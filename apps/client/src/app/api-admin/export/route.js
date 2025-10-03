// apps/client/src/app/api-admin/export/route.js
import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/api-handler'
import { generateExport } from '@headlines/data-access'
import { exportSchema } from '@headlines/models/schemas'

const handlePost = async (request) => {
  const body = await request.json()
  const validation = exportSchema.safeParse(body)

  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid input.', details: validation.error.flatten() },
      { status: 400 }
    )
  }

  const result = await generateExport(validation.data)

  if (!result.success) {
    throw new Error(result.error)
  }

  const filename = `export_${validation.data.entity}_${new Date().toISOString()}.${result.extension}`

  return new Response(result.data, {
    headers: {
      'Content-Type': result.contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

export const POST = createApiHandler(handlePost)
