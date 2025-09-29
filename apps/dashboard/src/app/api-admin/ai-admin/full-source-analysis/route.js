// apps/admin/src/app/api/ai/full-source-analysis/route.js (REVISED)
import { NextResponse } from 'next/server'
import { initializeSharedLogic } from '@/lib/init-shared-logic'
import { verifyAdmin } from '@headlines/auth'
import { autoConfigureSourceFromUrl } from '@headlines/ai-services/admin-orchestrators' // New Import

export async function POST(request) {
  const { isAdmin, error: authError } = await verifyAdmin()
  if (!isAdmin) {
    return NextResponse.json({ error: authError }, { status: 401 })
  }

  try {
    await initializeSharedLogic()
    const { url } = await request.json()
    const result = await autoConfigureSourceFromUrl(url) // Call shared logic
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to perform full source analysis.',
        details: error.message,
      },
      { status: 500 }
    )
  }
}
