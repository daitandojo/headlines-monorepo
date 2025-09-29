import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/api-handler'
import { Source } from '@headlines/models'
// --- START OF THE FIX ---
// Import the high-level test orchestrator instead of low-level scraper functions.
import { testScraperRecipe } from '@headlines/scraper-logic/test-orchestrator'
// --- END OF THE FIX ---

const handlePost = async (request) => {
  const { sourceId, articleLink } = await request.json()

  if (!sourceId) {
    return NextResponse.json({ error: 'Source ID is required.' }, { status: 400 })
  }

  const source = await Source.findById(sourceId).lean()
  if (!source) {
    return NextResponse.json({ error: 'Source not found.' }, { status: 404 })
  }

  // --- START OF THE FIX ---
  // Delegate all complex scraping logic to the orchestrator function.
  // This abstracts away the direct dependency on Playwright.
  const result = await testScraperRecipe(source, articleLink)

  // Adapt the response based on the orchestrator's output.
  if (result.content) {
    return NextResponse.json({
      success: !!result.content.preview && !result.content.preview.startsWith('Error'),
      content: result.content.preview,
    })
  } else if (result.headlines) {
    return NextResponse.json({
      success: result.headlines.count > 0,
      articles: result.headlines.samples,
      resultCount: result.headlines.count,
    })
  }

  return NextResponse.json(
    { success: false, error: 'Scraping test failed.' },
    { status: 500 }
  )
  // --- END OF THE FIX ---
}

export const POST = createApiHandler(handlePost)
export const dynamic = 'force-dynamic'
