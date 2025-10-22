// packages/pipeline/src/modules/email/components/opportunityFormatter.js
import { logger, getCountryFlag } from '@headlines/utils-shared'

function createOpportunityCard(opportunity) {
  const { reachOutTo, contactDetails, lastKnownEventLiquidityMM, basedIn, whyContact } =
    opportunity

  const flags = Array.isArray(basedIn)
    ? basedIn.map(getCountryFlag).join(' ')
    : getCountryFlag(basedIn)

  const whyContactHtml = (whyContact || [])
    .map(
      (reason) =>
        `<li style="margin-bottom: 8px; color: #dddddd; line-height: 1.5;">${reason}</li>`
    )
    .join('')

  return `
    <div style="background-color: #1A2E27; border-radius: 12px; margin-bottom: 25px; padding: 25px; border: 1px solid #2A4F3A; box-shadow: 0 10px 25px rgba(0,0,0,0.3);">
        <table role="presentation" style="width:100%;border-collapse:collapse;border:0;border-spacing:0;">
            <tr>
                <td style="padding-bottom: 15px;">
                    <table role="presentation" style="width:100%;border-collapse:collapse;border:0;border-spacing:0;">
                        <tr>
                            <td style="width: 70px; vertical-align: top;" valign="top">
                                <p style="font-size: 28px; font-weight: 700; color: #4CAF50; margin: 0;">${
                                  lastKnownEventLiquidityMM
                                    ? `$${lastKnownEventLiquidityMM}M`
                                    : 'N/A'
                                }</p>
                                <p style="font-size: 12px; color: #a0a0a0; margin: 0;">Est. Liquidity</p>
                            </td>
                            <td style="padding-left: 20px;">
                                <h2 style="margin:0; font-size: 20px; font-weight: 600; color: #EAEAEA; line-height: 1.4;">${flags} ${reachOutTo}</h2>
                                <p style="margin: 4px 0 0; font-size: 14px; color: #bbbbbb;">${
                                  contactDetails?.role || 'Key Principal'
                                } at <strong>${
                                  contactDetails?.company || 'N/A'
                                }</strong></p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            <tr>
              <td style="padding: 16px 0 8px; border-top: 1px solid #444444;">
                  <p style="margin:0; font-size: 14px; color: #4CAF50; font-weight: 600;">Actionable Insights (Why Contact)</p>
              </td>
            </tr>
            <tr>
              <td>
                <ul style="margin: 0; padding-left: 20px; font-size: 14px;">
                  ${whyContactHtml}
                </ul>
              </td>
            </tr>
        </table>
    </div>
  `
}

export function formatOpportunityForEmail(opportunity) {
  logger.info(
    { opportunity: { name: opportunity.reachOutTo } },
    'Formatting opportunity card for email.'
  )
  if (!opportunity || typeof opportunity !== 'object' || !opportunity.reachOutTo) {
    logger.warn(`formatOpportunityForEmail: Invalid opportunity object provided.`, {
      oppPreview: opportunity,
    })
    throw new Error('Invalid opportunity object provided.')
  }
  try {
    const cardHtml = createOpportunityCard(opportunity)
    logger.info(
      { oppName: opportunity.reachOutTo },
      'Successfully formatted opportunity card.'
    )
    return cardHtml
  } catch (error) {
    logger.error(
      `Error creating opportunity card for email: "${opportunity.reachOutTo}"`,
      { errorMessage: error.message, stack: error.stack }
    )
    throw error
  }
}
