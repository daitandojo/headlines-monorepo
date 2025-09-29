import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/api-handler'
// --- START OF THE FIX ---
// Import the single, generic export function
import { generateExport } from '@headlines/data-access'
// --- END OF THE FIX ---

const handlePost = async (request) => {
  const { entity, fileType, filters, sort } = await request.json()

  // --- START OF THE FIX ---
  // Call the single generic function with all the necessary parameters
  const result = await generateExport({ entity, fileType, filters, sort })
  // --- END OF THE FIX ---

  if (!result.success) {
    throw new Error(result.error)
  }

  const filename = `export_${entity}_${new Date().toISOString()}.${result.extension}`

  return new Response(result.data, {
    headers: {
      'Content-Type': result.contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

export const POST = createApiHandler(handlePost)
