import { initializeSharedLogic } from '@/lib/init-shared-logic.js';
// apps/admin/src/app/api/ai/full-source-analysis/route.js (version 2.0.1)
import { NextResponse } from 'next/server'
import { initializeSharedLogic } from '@/lib/init-shared-logic'
import {  smartStripHtml  } from '@headlines/utils/src/server.js';
import { fetchPageWithPlaywright, testHeadlineExtraction } from '@headlines/scraper-logic/src/scraper/index.js'
import { callLanguageModel } from '@headlines/ai-services/src/index.js'
import { verifyAdmin } from '@headlines/auth/src/index.js'

const getSourceAnalysisPrompt = () => `
You are an expert web scraping engineer. Your task is to devise a complete, robust "Extraction Recipe" for scraping headlines from the provided HTML.
**CRITICAL Instructions:**
1.  **Analyze HTML Structure:** Identify the primary repeating container element for each news article.
2.  **Devise the Recipe:** You MUST determine three key CSS selectors:
    *   \`headlineSelector\`: The selector for the main container of a single article teaser.
    *   \`linkSelector\`: The selector for the \`<a>\` tag, *relative to the headlineSelector*.
    *   \`headlineTextSelector\`: The selector for the element containing the headline text, *relative to the headlineSelector*.
    *   \`articleSelector\`: A best-guess, robust selector for the main article content (e.g., \`div.article-body\`).
3.  **Your response MUST be a valid JSON object:** \`{ "recipe": { "headlineSelector": "...", "linkSelector": "...", "headlineTextSelector": "...", "articleSelector": "..." } }\`
`

export async function POST(request) {
  await initializeSharedLogic();
  const { isAdmin, error: authError } = await verifyAdmin()
  if (!isAdmin) {
    return NextResponse.json({ error: authError }, { status: 401 })
  }

  try {
    initializeSharedLogic()
    const { url } = await request.json()
    if (!url) return NextResponse.json({ error: 'URL is required.' }, { status: 400 })

    const rawHtml = await fetchPageWithPlaywright(url)
    const cleanHtml = await smartStripHtml(rawHtml)

    const analysis = await callLanguageModel({
      modelName: process.env.LLM_MODEL_UTILITY || 'gpt-5-nano',
      systemPrompt: getSourceAnalysisPrompt(),
      userContent: `Analyze the following HTML and provide a complete extraction recipe.\n\nHTML:\n\`\`\`html\n${cleanHtml}\n\`\`\``,
      isJson: true,
    })

    const recipe = analysis.recipe
    const configuration = {
      ...recipe,
      sectionUrl: url,
      status: 'active',
      scrapeFrequency: 'high',
      isStatic: false,
      isDynamicContent: true,
      extractionMethod: 'declarative',
    }
    try {
      const urlObject = new URL(url)
      configuration.baseUrl = urlObject.origin
      const name = urlObject.hostname.replace(/^www\./, '').split('.')[0]
      configuration.name = name.charAt(0).toUpperCase() + name.slice(1)
    } catch (e) {}

    const headlines = await testHeadlineExtraction(configuration, rawHtml)
    if (headlines.length === 0) {
      throw new Error('AI analysis complete, but live test found 0 headlines.')
    }

    return NextResponse.json({
      success: true,
      configuration,
      testResults: { count: headlines.length, headlines: headlines.slice(0, 5) },
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to perform full source analysis.', details: error.message }, { status: 500 })
  }
}
