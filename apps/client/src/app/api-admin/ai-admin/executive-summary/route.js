import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/api-handler'
import { executiveSummaryChain } from '@headlines/ai-services/next'

const handlePost = async (request) => {
  const { judgeVerdict, freshHeadlinesFound } = await request.json()

  const hasEvents = judgeVerdict?.event_judgements?.length > 0
  const hasOpps = judgeVerdict?.opportunity_judgements?.length > 0

  if (!judgeVerdict || (!hasEvents && !hasOpps)) {
    return NextResponse.json({
      success: true,
      summary: 'No new events or opportunities were generated in this run to summarize.',
    })
  }

  const payload = {
    freshHeadlinesFound: freshHeadlinesFound || 0,
    judgeVerdict,
  }

  const result = await executiveSummaryChain({
    payload_json_string: JSON.stringify(payload),
  })

  if (result.error || !result.summary) {
    console.error('Executive Summary Chain failed:', result.error)
    return NextResponse.json({
      success: true,
      summary: 'The AI was unable to generate a summary for this run.',
    })
  }

  return NextResponse.json({ success: true, summary: result.summary })
}

export const POST = createApiHandler(handlePost)
