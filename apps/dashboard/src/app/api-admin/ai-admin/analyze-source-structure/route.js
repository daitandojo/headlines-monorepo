// apps/admin/src/app/api/ai/analyze-source-structure/route.js (REVISED)
import { NextResponse } from 'next/server'
import { verifyAdmin } from '@headlines/auth'
import { initializeSharedLogic } from '@/lib/init-shared-logic.js'
import { analyzeSourceForSelectors } from '@headlines/ai-services/admin-orchestrators' // New Import

export async function POST(request) {
  await initializeSharedLogic()
  const { isAdmin, error: authError } = await verifyAdmin()
  if (!isAdmin) {
    return NextResponse.json({ success: false, error: authError }, { status: 401 })
  }

  try {
    const { url } = await request.json()
    const result = await analyzeSourceForSelectors(url) // Call shared logic
    return NextResponse.json(result)
  } catch (e) {
    console.error('[API analyze-source-structure Error]', e)
    return NextResponse.json(
      { success: false, error: 'Analysis failed', details: e.message },
      { status: 500 }
    )
  }
}
