// apps/admin/src/app/api/scrape/test-recipe/route.js (REVISED)
import { NextResponse } from 'next/server'
import { initializeSharedLogic } from '@/lib/init-shared-logic'
import { verifyAdmin } from '@headlines/auth'
import { testScraperRecipe } from '@headlines/scraper-logic/test-orchestrator' // New Import

export async function POST(request) {
  const { isAdmin, error: authError } = await verifyAdmin()
  if (!isAdmin) {
    return NextResponse.json({ error: authError }, { status: 401 })
  }

  try {
    await initializeSharedLogic()
    const { sourceConfig, articleUrl } = await request.json()
    const result = await testScraperRecipe(sourceConfig, articleUrl) // Call shared logic
    return NextResponse.json(result)
  } catch (error) {
    console.error('[API Test Recipe Error]', error)
    return NextResponse.json(
      { success: false, error: 'Failed to perform test scrape.', details: error.message },
      { status: 500 }
    )
  }
}
