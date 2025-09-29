import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/api-handler'
import { executiveSummaryChain } from '@headlines/ai-services/next' // Use the /next entry point

const handlePost = async (request) => {
  const { judgeVerdict, freshHeadlinesFound } = await request.json()

  // --- START OF THE FIX ---
  // Add a check to see if there's anything to summarize.
  const hasEvents = judgeVerdict?.event_judgements?.length > 0
  const hasOpps = judgeVerdict?.opportunity_judgements?.length > 0

  if (!judgeVerdict || (!hasEvents && !hasOpps)) {
    // If there's nothing to judge, return a default summary immediately.
    return NextResponse.json({
      success: true,
      summary: 'No new events or opportunities were generated in this run to summarize.',
    })
  }
  // --- END OF THE FIX ---

  const payload = {
    freshHeadlinesFound: freshHeadlinesFound || 0,
    judgeVerdict,
  }

  const result = await executiveSummaryChain({
    payload_json_string: JSON.stringify(payload),
  })

  // --- START OF THE FIX ---
  // Check if the AI call failed or returned an empty summary.
  if (result.error || !result.summary) {
    // Log the error but return a graceful fallback instead of throwing.
    console.error('Executive Summary Chain failed:', result.error)
    return NextResponse.json({
      success: true,
      summary: 'The AI was unable to generate a summary for this run.',
    })
  }
  // --- END OF THE FIX ---

  return NextResponse.json({ success: true, summary: result.summary })
}

export const POST = createApiHandler(handlePost)
