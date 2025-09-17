import { initializeSharedLogic } from '@/lib/init-shared-logic.js';
// apps/admin/src/app/api/scrape/analyze-url/route.js (version 4.0.1)
import { NextResponse } from 'next/server'
import { initializeSharedLogic } from '@/lib/init-shared-logic'
import {  smartStripHtml  } from '@headlines/utils/src/server.js';
import { fetchPageWithPlaywright, testHeadlineExtraction } from '@headlines/scraper-logic/src/scraper/index.js'
import { callLanguageModel } from '@headlines/ai-services/src/index.js'
import { verifyAdmin } from '@headlines/auth/src/index.js'

const getScraperAnalysisPrompt = () => `
You are a master web scraping engineer. You will be given the cleaned HTML from a news website's front page and, optionally, some example headlines. Your task is to analyze the structure and determine the most robust CSS selectors for scraping all headlines.
**CRITICAL Instructions:**
1.  **Determine Extraction Method:** Analyze the HTML to see if it uses JSON-LD. If a \`script[type="application/ld+json"]\` tag contains a list of news articles, the method should be \`json-ld\`. Otherwise, it should be \`declarative\`.
2.  **Find the Best Selector:** Identify the single, repeating CSS selector that uniquely wraps each news item.
3.  **Provide a Rationale:** Briefly explain your choice.
4.  **Handle Examples:** If example headlines and outerHTML are provided, use them as a strong guide.
5.  **Return Multiple Suggestions:** Provide a list of the top 1-3 most likely selectors.
6.  **Your response MUST be a valid JSON object:** \`{ "extractionMethod": "declarative" | "json-ld", "suggestions": [{ "selector": "CSS selector", "reasoning": "Your explanation." }] }\`
`
const analyzePageForScraping = async (html, example1, example2, outerHTML) => {
  let userContent = `Analyze the following HTML:\n\`\`\`html\n${html}\n\`\`\``
  if (example1 && example2) userContent += `\n\nUse these examples as a guide:\n- Example 1: "${example1}"\n- Example 2: "${example2}"`
  if (outerHTML) userContent += `\n\nThe user identified this element's outerHTML:\n\`\`\`html\n${outerHTML}\n\`\`\``
  const result = await callLanguageModel({
    modelName: process.env.LLM_MODEL_UTILITY || 'gpt-5-nano',
    systemPrompt: getScraperAnalysisPrompt(),
    userContent,
    isJson: true,
  })
  if (result.error) throw new Error(result.error)
  return result
}

export async function POST(request) {
  await initializeSharedLogic();
  const { isAdmin, error: authError } = await verifyAdmin()
  if (!isAdmin) {
    return NextResponse.json({ error: authError }, { status: 401 })
  }

  try {
    initializeSharedLogic()
    const { url, example1, example2, outerHTML } = await request.json()
    if (!url) return NextResponse.json({ error: 'URL is required.' }, { status: 400 })

    const fullHtml = await fetchPageWithPlaywright(url)
    const cleanHtml = await smartStripHtml(fullHtml)
    const analysis = await analyzePageForScraping(cleanHtml, example1, example2, outerHTML)

    const suggestionsWithSamples = await Promise.all(
      analysis.suggestions.map(async (suggestion) => {
        const headlines = await testHeadlineExtraction({
            extractionMethod: analysis.extractionMethod,
            sectionUrl: url,
            baseUrl: new URL(url).origin,
            headlineSelector: suggestion.selector,
          })
        return { ...suggestion, count: headlines.length, samples: headlines.slice(0, 3) }
      })
    )
    return NextResponse.json({ success: true, analysis: { ...analysis, suggestions: suggestionsWithSamples.filter((s) => s.count > 0) } })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to analyze URL.', details: error.message }, { status: 500 })
  }
}
