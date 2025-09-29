import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/api-handler'
import { Source } from '@headlines/models'

// --- START OF THE FIX ---
// Import the scraper functions from their correct subpath export, not the root.
import {
  scrapeSiteForHeadlines,
  scrapeArticleContent,
} from '@headlines/scraper-logic/scraper/index.js'
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

  // Mode 1: Scrape a single article's content
  if (articleLink) {
    const articleStub = {
      link: articleLink,
      source: source.name,
      newspaper: source.name,
      country: source.country,
    }
    const result = await scrapeArticleContent(articleStub, source)
    return NextResponse.json({
      success: !!result.articleContent,
      content: result.articleContent?.contents?.join('\n\n') || result.enrichment_error,
    })
  }

  // Mode 2: Scrape headlines for the source's main section URL
  const result = await scrapeSiteForHeadlines(source)
  return NextResponse.json(result)
}

export const POST = createApiHandler(handlePost)
export const dynamic = 'force-dynamic'
