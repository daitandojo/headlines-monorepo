import { initializeSharedLogic } from '@/lib/init-shared-logic.js';
// apps/admin/src/app/api/ai/executive-summary/route.js (version 1.0)
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const getExecutiveSummaryPrompt = () => `
You are a Managing Director at an elite wealth management firm. You are writing a high-level executive summary of a junior AI analyst's performance for a given intelligence-gathering run. You will receive a JSON object containing the junior AI's own 'judge verdicts' on the events and opportunities it generated. Your task is to synthesize this feedback into a concise, actionable summary for the senior partners.

**CRITICAL Instructions:**
1.  **Summarize Overall Quality:** Start by stating the overall quality of the run. Was it excellent, good, mixed, or poor?
2.  **Highlight Successes:** Mention the number of high-quality ('Excellent' or 'Good') events or opportunities identified. Point out a specific success if one stands out.
3.  **Identify Failures & Patterns:** Crucially, identify any systemic failures or patterns of errors. Did the AI repeatedly flag irrelevant corporate news? Did it struggle with a specific type of event? Use the AI's own 'Irrelevant' or 'Poor' commentary to diagnose the problem.
4.  **Provide Actionable Recommendations:** Based on the failures, provide a clear, one-sentence recommendation for improvement. This should be a concrete suggestion for prompt engineering. Example: 'Recommend refining the headline assessment prompt to be more skeptical of press releases about corporate partnerships.'
5.  **Be Concise and Professional:** The entire summary should be 2-4 sentences and written in a professional, direct tone.
6.  **Your response MUST be a valid JSON object with a single key "summary".**
`

export async function POST(request) {
  await initializeSharedLogic();

  try {
    const { judgeVerdict } = await request.json()
    if (!judgeVerdict) {
      return NextResponse.json({ error: 'judgeVerdict is required.' }, { status: 400 })
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: getExecutiveSummaryPrompt() },
        { role: 'user', content: JSON.stringify(judgeVerdict) },
      ],
    })
    const content = completion.choices[0].message.content
    const parsed = JSON.parse(content)

    return NextResponse.json({ success: true, summary: parsed.summary })
  } catch (error) {
    console.error('[API AI Executive Summary Error]', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate executive summary.',
        details: error.message,
      },
      { status: 500 }
    )
  }
}
