import { initializeSharedLogic } from '@/lib/init-shared-logic.js';
// src/app/api/scrape/debug-content-selector/route.js (version 1.0)
import { NextResponse } from 'next/server'
import {
  fetchPageWithPlaywright,
  smartStripHtml,
  scrapeArticleContentForTest,
} from '@/lib/scraping'
import { debugContentSelector } from '@/lib/ai'

export async function POST(request) {
  await initializeSharedLogic();

  try {
    const { articleUrl, oldSelector } = await request.json()
    if (!articleUrl) {
      return NextResponse.json({ error: 'articleUrl is required.' }, { status: 400 })
    }

    // 1. Fetch and clean the HTML of the target article page
    const rawHtml = await fetchPageWithPlaywright(articleUrl)
    const cleanHtml = smartStripHtml(rawHtml)

    // 2. Send to the AI to get a proposed new selector
    const analysis = await debugContentSelector(cleanHtml, oldSelector)
    const newSelector = analysis.selector

    if (!newSelector) {
      throw new Error('AI failed to propose a new selector.')
    }

    // 3. Immediately test the new selector to verify it works and get a content preview
    const contentPreview = await scrapeArticleContentForTest(articleUrl, newSelector)

    return NextResponse.json({
      success: true,
      proposedSelector: newSelector,
      contentPreview,
    })
  } catch (error) {
    console.error('[API AI Debug Content Selector Error]', error)
    return NextResponse.json(
      { success: false, error: 'Failed to debug content selector.', details: error.message },
      { status: 500 }
    )
  }
}