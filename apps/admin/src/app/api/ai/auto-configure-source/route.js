import { initializeSharedLogic } from '@/lib/init-shared-logic.js';
// src/app/api/ai/auto-configure-source/route.js (version 1.0)
import { NextResponse } from 'next/server'
import { fetchPageWithPlaywright, smartStripHtml } from '@/lib/scraping'
import { analyzePageForScraping } from '@/lib/ai'

export async function POST(request) {
  await initializeSharedLogic();

  try {
    const { url } = await request.json()
    if (!url) {
      return NextResponse.json({ error: 'URL is required.' }, { status: 400 })
    }

    // 1. Fetch the raw page content
    const rawHtml = await fetchPageWithPlaywright(url)

    // 2. Use "smart stripping" to clean and focus the HTML
    const cleanHtml = smartStripHtml(rawHtml)

    // 3. Send the cleaned HTML to the AI for a "blind" analysis (no examples)
    const analysis = await analyzePageForScraping(cleanHtml)

    if (!analysis || !analysis.suggestions || analysis.suggestions.length === 0) {
      throw new Error('AI could not determine a valid scraping configuration.')
    }

    // 4. Automatically select the best suggestion (usually the one with the most hits)
    const bestSuggestion = analysis.suggestions.sort((a, b) => b.count - a.count)[0]

    const autoConfig = {
      extractionMethod: analysis.extractionMethod,
      headlineSelector: bestSuggestion.selector,
      // Reset relative selectors as the main one is new
      linkSelector: '',
      headlineTextSelector: '',
    }

    // Auto-fill basic info from the URL
    try {
      const urlObject = new URL(url)
      autoConfig.baseUrl = urlObject.origin
      const name = urlObject.hostname.replace(/^www\./, '').split('.')[0]
      autoConfig.name = name.charAt(0).toUpperCase() + name.slice(1)
    } catch (e) {
      // ignore if URL is invalid
    }

    return NextResponse.json({ success: true, configuration: autoConfig })
  } catch (error) {
    console.error('[API Auto-Configure Error]', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to auto-configure source.',
        details: error.message,
      },
      { status: 500 }
    )
  }
}
