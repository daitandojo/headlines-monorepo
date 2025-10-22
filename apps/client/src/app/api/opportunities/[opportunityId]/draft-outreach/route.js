// apps/client/src/app/api/opportunities/[opportunityId]/draft-outreach/route.js
import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/api-handler'
import { getOpportunityDetails } from '@headlines/data-access/next'
import { outreachDraftChain } from '@headlines/ai-services/next'

const handlePost = async (request, { params }) => {
  const { opportunityId } = params

  const oppResult = await getOpportunityDetails(opportunityId)
  if (!oppResult.success || !oppResult.data) {
    return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })
  }

  const result = await outreachDraftChain({
    opportunity_json_string: JSON.stringify(oppResult.data),
  })

  if (result.error) {
    return NextResponse.json(
      { error: `AI failed to draft outreach: ${result.error}` },
      { status: 500 }
    )
  }

  return NextResponse.json(result)
}

export const POST = createApiHandler(handlePost)
export const dynamic = 'force-dynamic'
