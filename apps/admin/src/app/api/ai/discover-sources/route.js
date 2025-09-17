import { initializeSharedLogic } from '@/lib/init-shared-logic.js';
// src/app/api/ai/discover-sources/route.js (version 1.1)
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// CORRECTIVE ACTION: Upgraded prompt to be context-aware of existing sources
const getSourceDiscoveryPrompt = () => `
You are an expert financial intelligence researcher with deep knowledge of global media markets. Your task is to identify influential and relevant news sources for a specific country that are NOT on a provided list of existing sources.
**CRITICAL Instructions:**
1.  **Analyze the Country and Existing Sources:** You will receive a country name and an array of source names that are already onboarded.
2.  **Find NEW Sources:** Your primary goal is to find sources that are NOT on the existing list.
3.  **Categorize Sources:** Categorize your findings into three types: "Financial News", "Private Equity & Venture Capital", and "M&A News".
4.  **Provide Top Sources:** For each category, list up to 5 of the most prominent and respected sources.
5.  **Include Name and URL:** For each source, you must provide its official \`name\` and the direct \`url\` to its homepage or relevant news section.
6.  **Strict Formatting:** Your entire response must be a single, valid JSON object.

Example Input User Content:
"Country: Denmark. Existing Sources: [\\"Børsen\\", \\"KapitalWatch\\"]"

Example Response:
{
  "financial_news": [
    { "name": "Finans.dk", "url": "https://finans.dk/" }
  ],
  "pe_vc_news": [
    { "name": "Bootstrapping.dk", "url": "https://bootstrapping.dk/" }
  ],
  "ma_news": [
    { "name": "RevisionsWatch", "url": "https://revisionswatch.dk/" }
  ]
}
`

export async function POST(request) {
  await initializeSharedLogic();

  try {
    // CORRECTIVE ACTION: Accept existing sources in the request body
    const { country, existingSources } = await request.json()
    if (!country) {
      return NextResponse.json({ error: 'Country is required.' }, { status: 400 })
    }

    const userContent = `Country: ${country}. Existing Sources: ${JSON.stringify(existingSources || [])}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-5-mini', // Using gpt-5-mini as requested
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: getSourceDiscoveryPrompt() },
        { role: 'user', content: userContent },
      ],
    })
    const content = completion.choices[0].message.content
    const parsed = JSON.parse(content)

    return NextResponse.json({ success: true, suggestions: parsed })
  } catch (error) {
    console.error('[API AI Discover Sources Error]', error)
    return NextResponse.json(
      { success: false, error: 'Failed to discover sources.', details: error.message },
      { status: 500 }
    )
  }
}
