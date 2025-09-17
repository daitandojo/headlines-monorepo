import { initializeSharedLogic } from '@/lib/init-shared-logic.js';
// src/app/api/ai/debug-source/route.js (version 1.0)
import { NextResponse } from 'next/server'
import {
  fetchPageWithPlaywright,
  smartStripHtml,
  testHeadlineExtraction,
} from '@/lib/scraping'
import { debugSourceSelectors } from '@/lib/ai' // A new, specialized AI function

export async function POST(request) {
  await initializeSharedLogic();

  try {
    const sourceConfig = await request.json()
    if (!sourceConfig || !sourceConfig.sectionUrl) {
      return NextResponse.json(
        { error: 'Source configuration is required.' },
        { status: 400 }
      )
    }

    // 1. Fetch the current, "broken" HTML from the source's page
    const rawHtml = await fetchPageWithPlaywright(sourceConfig.sectionUrl)
    const cleanHtml = smartStripHtml(rawHtml)

    // 2. Send the cleaned HTML and the old, non-working selectors to the AI for analysis
    const analysis = await debugSourceSelectors(cleanHtml, sourceConfig)

    if (!analysis || !analysis.suggestions || analysis.suggestions.length === 0) {
      throw new Error('AI could not find a corrected selector.')
    }

    const bestSuggestion = analysis.suggestions[0] // Trust the AI's top suggestion
    const proposedConfig = {
      ...sourceConfig,
      extractionMethod: analysis.extractionMethod,
      headlineSelector: bestSuggestion.selector,
      linkSelector: '', // Reset relative selectors
      headlineTextSelector: '',
    }

    // 3. Immediately perform a live test scrape with the AI's proposed new configuration
    const headlines = await testHeadlineExtraction(proposedConfig, rawHtml)
    const firstArticleContent =
      headlines.length > 0
        ? await scrapeArticleContentForTest(
            headlines[0].link,
            proposedConfig.articleSelector
          )
        : ''

    // 4. Return the full results of the test, including the proposed changes
    return NextResponse.json({
      success: true,
      proposedConfig,
      testResults: {
        success: headlines.length > 0,
        count: headlines.length,
        headlines: headlines.slice(0, 5),
        firstArticleContent,
      },
    })
  } catch (error) {
    console.error('[API AI Debug Source Error]', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to debug source with AI.',
        details: error.message,
      },
      { status: 500 }
    )
  }
}
