// apps/admin/src/app/api/ai/enrich-entity/route.js (version 1.0)
import { NextResponse } from 'next/server'
import { initializeSharedLogic } from '@/lib/init-shared-logic'
import { callLanguageModel } from '@headlines/ai-services'
import { verifyAdmin } from '@headlines/auth'

const getEntityEnrichmentPrompt = () => `
You are a corporate intelligence analyst. Your task is to provide a brief, factual, one-sentence context for a given person, family, or company name. This context will be used in a financial intelligence watchlist.
**CRITICAL Instructions:**
1.  **Analyze the entity name and type.**
2.  **Provide a single, concise sentence.** Examples: "Founder and CEO of Microsoft.", "Danish family behind the LEGO Group (Kirkbi A/S).", "Leading Nordic private equity firm."
3.  **Be factual and neutral.**
4.  **If the name is ambiguous or you have no information, you MUST return "null".**
5.  **Your response MUST be a valid JSON object with the following structure:** { "context": "Your one-sentence description." | null }
`

export async function POST(request) {
  const { isAdmin, error: authError } = await verifyAdmin()
  if (!isAdmin) {
    return NextResponse.json({ error: authError }, { status: 401 })
  }

  try {
    await initializeSharedLogic()
    const { name, type } = await request.json()

    if (!name || !type) {
      return NextResponse.json(
        { error: 'Entity name and type are required.' },
        { status: 400 }
      )
    }

    const userContent = `Enrich the following entity:\nName: ${name}\nType: ${type}`
    const result = await callLanguageModel({
      modelName: process.env.LLM_MODEL_UTILITY || 'gpt-5-nano',
      systemPrompt: getEntityEnrichmentPrompt(),
      userContent,
      isJson: true,
    })

    if (result.error) {
      throw new Error(result.error)
    }

    return NextResponse.json({ success: true, context: result.context })
  } catch (error) {
    console.error('[API AI Enrich Entity Error]', error)
    return NextResponse.json(
      { success: false, error: 'Failed to enrich entity.', details: error.message },
      { status: 500 }
    )
  }
}
