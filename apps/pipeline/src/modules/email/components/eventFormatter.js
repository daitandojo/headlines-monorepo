// apps/pipeline/src/modules/email/components/eventFormatter.js
import { logger } from '@headlines/utils-shared'
import { Opportunity } from '@headlines/models'

const sourceIcons = {
  rag_db: '🗄️',
  wikipedia: '🌐',
  news_api: '📰',
}

function formatEnrichmentSources(sources = []) {
  if (sources.length === 0) return ''
  const icons = sources.map((s) => sourceIcons[s] || '❓').join(' ')
  return `<span style="font-size: 14px; margin-left: 12px; vertical-align: middle;">${icons}</span>`
}

async function getOpportunitiesForEvent(eventId) {
  try {
    if (!eventId) return []
    return await Opportunity.find({ events: eventId }).lean()
  } catch (error) {
    logger.error(
      { err: error, eventId },
      'Failed to fetch opportunities for an event card.'
    )
    return []
  }
}

// NEW: Helper component for transaction details
function formatTransactionDetails(details) {
  if (!details) return ''

  const detailRow = (label, value, unit = '') => {
    if (value === null || value === undefined) return ''
    return `<div style="font-size: 13px; color: #bbbbbb; margin-bottom: 4px;"><strong>${label}:</strong> ${value}${unit}</div>`
  }

  const flow = details.liquidityFlow
  const flowText = flow?.nature ? `${flow.nature} (~$${flow.approxAmountUSD}M)` : ''

  return `
    <tr>
        <td style="padding: 16px 0 8px; border-top: 1px solid #444444;">
            <p style="margin:0; font-size: 14px; color: #D4AF37; font-weight: 600;">Transaction Details</p>
        </td>
    </tr>
    <tr>
        <td>
            ${detailRow('Type', details.transactionType)}
            ${detailRow('Valuation', details.valuationAtEventUSD, 'M USD')}
            ${detailRow('Ownership Change', details.ownershipPercentageChange, '%')}
            ${detailRow('Liquidity Flow', flowText)}
        </td>
    </tr>
  `
}

async function createEventBriefCard(event) {
  const {
    _id,
    synthesized_headline,
    synthesized_summary,
    advisorSummary, // MODIFIED
    source_articles,
    highest_relevance_score,
    enrichmentSources,
    eventClassification,
    transactionDetails, // NEW
    tags, // NEW
  } = event

  const opportunities = await getOpportunitiesForEvent(_id)
  const scoreColor =
    highest_relevance_score >= 80
      ? '#4CAF50'
      : highest_relevance_score >= 50
        ? '#FFC107'
        : '#F44336'
  const scoreTextShadow = `0 0 8px ${scoreColor}40`

  const classificationHtml = eventClassification
    ? `<div style="margin-top: 8px; display: inline-block; padding: 3px 10px; background-color: rgba(212, 175, 55, 0.1); border: 1px solid rgba(212, 175, 55, 0.2); border-radius: 99px; font-size: 11px; font-weight: 600; color: #D4AF37; text-transform: uppercase; letter-spacing: 0.5px;">${eventClassification}</div>`
    : ''
  const tagsHtml =
    tags && tags.length > 0
      ? `<div style="margin-top: 8px; display: flex; flex-wrap: wrap; gap: 6px;">${tags.map((tag) => `<span style="padding: 2px 8px; background-color: #333; border-radius: 4px; font-size: 11px; color: #bbb;">${tag}</span>`).join('')}</div>`
      : ''

  const opportunitiesHtml =
    opportunities?.length > 0
      ? `
    <tr><td style="padding: 16px 0 8px; border-top: 1px solid #444444;"><p style="margin:0; font-size: 14px; color: #D4AF37; font-weight: 600;">Related Opportunities</p></td></tr>
    <tr><td>${opportunities.map((opp) => `<div style="font-size: 14px; color: #cccccc; line-height: 1.6; margin-bottom: 8px;"><strong>${opp.reachOutTo}</strong> (~$${opp.likelyMMDollarWealth}M) - <em>${opp.contactDetails?.role || 'Role not specified'}</em></div>`).join('')}</td></tr>`
      : ''

  const reasoningHtml = advisorSummary
    ? `
    <tr><td style="padding: 16px 0 0; border-top: 1px solid #444444;"><p style="margin:0; font-size: 12px; color: #a0a0a0; font-style: italic;"><strong>Advisor Note:</strong> ${advisorSummary}</p></td></tr>`
    : ''

  const sourcesHtml = (source_articles || [])
    .map(
      (article) =>
        `<tr><td style="padding: 4px 0;"><a href="${article.link}" style="color: #a0a0a0; text-decoration: none; font-size: 13px;">${article.newspaper}: ${article.headline}</a></td></tr>`
    )
    .join('')

  return `
    <div style="background-color: #1E1E1E; border-radius: 12px; margin-bottom: 25px; padding: 25px; border: 1px solid #333333; box-shadow: 0 10px 25px rgba(0,0,0,0.3);">
        <table role="presentation" style="width:100%;border-collapse:collapse;border:0;border-spacing:0;">
            <tr>
                <td style="padding-bottom: 15px;">
                    <table role="presentation" style="width:100%;border-collapse:collapse;border:0;border-spacing:0;">
                        <tr>
                            <td style="width: 70px; vertical-align: top;" valign="top">
                                <p style="font-size: 28px; font-weight: 700; color: ${scoreColor}; margin: 0; text-shadow: ${scoreTextShadow};">${highest_relevance_score}</p>
                                <p style="font-size: 12px; color: #a0a0a0; margin: 0;">Score</p>
                                ${classificationHtml}
                                ${tagsHtml}
                            </td>
                            <td style="padding-left: 20px;">
                                <h2 style="margin:0; font-size: 20px; font-weight: 600; color: #EAEAEA; line-height: 1.4;">${synthesized_headline}${formatEnrichmentSources(enrichmentSources)}</h2>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            <tr><td style="padding-bottom: 20px;"><p style="margin:0; font-size: 16px; color: #cccccc; line-height: 1.7;">${synthesized_summary}</p></td></tr>
            ${formatTransactionDetails(transactionDetails)}
            ${opportunitiesHtml}
            <tr><td style="padding: 16px 0 8px; border-top: 1px solid #444444;"><p style="margin:0; font-size: 14px; color: #D4AF37; font-weight: 600;">Source Articles</p></td></tr>
            <tr><td><table role="presentation" style="width:100%;border-collapse:collapse;border:0;border-spacing:0;">${sourcesHtml}</table></td></tr>
            ${reasoningHtml}
        </table>
    </div>`
}

export async function formatEventForEmail(event) {
  logger.info(
    { event: { _id: event._id, headline: event.synthesized_headline } },
    'Formatting event card for email.'
  )
  if (!event || typeof event !== 'object' || !event.synthesized_headline) {
    logger.warn(`formatEventForEmail: Invalid event object provided.`, {
      eventPreview: event,
    })
    throw new Error('Invalid event object provided to formatEventForEmail.')
  }
  try {
    const cardHtml = await createEventBriefCard(event)
    logger.info({ eventId: event._id }, 'Successfully formatted event card.')
    return cardHtml
  } catch (error) {
    logger.error(`Error creating event card for email: "${event.synthesized_headline}"`, {
      errorMessage: error.message,
      stack: error.stack,
    })
    throw error
  }
}
