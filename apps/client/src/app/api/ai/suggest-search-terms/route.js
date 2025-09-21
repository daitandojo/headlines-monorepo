// apps/admin/src/app/api/ai/suggest-search-terms/route.js (version 1.0)
import { NextResponse } from 'next/server'
import { callLanguageModel } from '@headlines/ai-services'
import { verifyAdmin } from '@headlines/auth'
import { initializeSharedLogic } from '@/lib/init-shared-logic.js'

const getSearchTermPrompt = () => `
You are a search query generation expert for a financial intelligence firm. Your task is to analyze an entity's name, type, and context to generate a list of likely search terms (or "crums") that would identify this entity in news headlines.

**CRITICAL Instructions:**
1.  **Analyze the Input:** You will receive the entity's formal name, its type (person, family, company), and a brief context sentence.
2.  **Generate Aliases and Keywords:** Think of common abbreviations, alternative spellings, key individuals, or related company names. For example, for "Kirk Kristiansen family", terms could be "kirk kristiansen", "lego family", "kirkbi". For "Hanni Merete Toosbuy Kasprzak", a key term would be "ecco".
3.  **Return a List:** Your output should be a list of 3-5 lowercase strings.
4.  **Simplicity is Key:** The terms should be simple and likely to appear in text.
5.  **Your response MUST be a valid JSON object with the following structure:** { "searchTerms": ["term1", "term2"] }
`

export async function POST(request) {
  await initializeSharedLogic()
  const { isAdmin, error: authError } = await verifyAdmin()
  if (!isAdmin) {
    return NextResponse.json({ error: authError }, { status: 401 })
  }

  try {
    const { name, type, context } = await request.json()
    if (!name || !type) {
      return NextResponse.json({ error: 'Name and type are required.' }, { status: 400 })
    }

    const userContent = `Entity Name: ${name}\nEntity Type: ${type}\nContext: ${context || 'No context provided.'}`

    const result = await callLanguageModel({
      modelName: process.env.LLM_MODEL_UTILITY || 'gpt-5-nano',
      systemPrompt: getSearchTermPrompt(),
      userContent,
      isJson: true,
    })
    if (result.error) throw new Error(result.error)

    return NextResponse.json({ success: true, searchTerms: result.searchTerms })
  } catch (error) {
    console.error('[API AI Suggest Search Terms Error]', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to suggest search terms.',
        details: error.message,
      },
      { status: 500 }
    )
  }
}
