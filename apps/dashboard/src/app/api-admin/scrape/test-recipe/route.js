// apps/dashboard/src/app/api-admin/scrape/test-recipe/route.js (REVISED)
import { NextResponse } from 'next/server'
import { initializeSharedLogic } from '@/lib/init-shared-logic'
import { verifyAdmin } from '@headlines/auth'

export async function POST(request) {
  const { isAdmin, error: authError } = await verifyAdmin()
  if (!isAdmin) {
    return NextResponse.json({ error: authError }, { status: 401 })
  }

  try {
    await initializeSharedLogic()
    const { sourceConfig, articleUrl } = await request.json()
    // Call the refactored, shared logic
    const result = await testScraperRecipe(sourceConfig, articleUrl) 
    return NextResponse.json(result)
  } catch (error) {
    console.error('[API Test Recipe Error]', error)
    return NextResponse.json(
      { success: false, error: 'Failed to perform test scrape.', details: error.message },
      { status: 500 }
    )
  }
}