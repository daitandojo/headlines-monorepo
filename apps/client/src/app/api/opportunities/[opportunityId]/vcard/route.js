// apps/client/src/app/api/opportunities/[opportunityId]/vcard/route.js
import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/api-handler'
import { getOpportunityDetails } from '@headlines/data-access/next'

const handleGet = async (request, { params }) => {
  const { opportunityId } = params

  const result = await getOpportunityDetails(opportunityId)
  if (!result.success || !result.data) {
    return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })
  }

  const opp = result.data
  const nameParts = opp.reachOutTo.split(' ')
  const firstName = nameParts.shift()
  const lastName = nameParts.join(' ')

  // Construct vCard string
  const vCard = `BEGIN:VCARD
VERSION:3.0
N:${lastName};${firstName};;;
FN:${opp.reachOutTo}
ORG:${opp.contactDetails?.company || ''}
TITLE:${opp.contactDetails?.role || ''}
EMAIL;TYPE=WORK,INTERNET:${opp.contactDetails?.email || ''}
NOTE:Source: Headlines AI. Wealth Origin: ${opp.profile?.wealthOrigin || 'N/A'}. Last known event liquidity: $${opp.lastKnownEventLiquidityMM}M.
END:VCARD`

  const fileName = `${opp.reachOutTo.replace(/ /g, '_')}.vcf`

  // Return as a downloadable file
  return new Response(vCard, {
    status: 200,
    headers: {
      'Content-Type': 'text/vcard',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  })
}

export const GET = createApiHandler(handleGet)
export const dynamic = 'force-dynamic'