// apps/pipeline/src/modules/email/components/eventFormatter.js (version 5.1.0)
import { logger } from '@headlines/utils/src/server.js'
import { Opportunity } from '@headlines/models/src/index.js'

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

async function createEventBriefCard(event) {
  const {
    _id,
    synthesized_headline,
    synthesized_summary,
    ai_assessment_reason,
    source_articles,
    highest_relevance_score,
    enrichmentSources,
    eventClassification, // Get the new field
  } = event

  const opportunities = await getOpportunitiesForEvent(_id)

  const scoreColor =
    highest_relevance_score >= 80
      ? '#4CAF50'
      : highest_relevance_score >= 50
        ? '#FFC107'
        : '#F44336'
  const scoreTextShadow = `0 0 8px ${scoreColor}40`

  // NEW: HTML block for the classification badge
  const classificationHtml = eventClassification
    ? `
    <div style="margin-top: 8px; display: inline-block; padding: 3px 10px; background-color: rgba(212, 175, 55, 0.1); border: 1px solid rgba(212, 175, 55, 0.2); border-radius: 99px; font-size: 11px; font-weight: 600; color: #D4AF37; text-transform: uppercase; letter-spacing: 0.5px;">
        ${eventClassification}
    </div>
  `
    : ''

  const opportunitiesHtml =
    opportunities && opportunities.length > 0
      ? `
    <tr>
        <td style="padding: 16px 0 8px; border-top: 1px solid #444444;">
            <p style="margin:0; font-size: 14px; color: #D4AF37; font-weight: 600;">Related Opportunities</p>
        </td>
    </tr>
    <tr>
        <td>
            ${opportunities
              .map(
                (opp) => `
                <div style="font-size: 14px; color: #cccccc; line-height: 1.6; margin-bottom: 8px;">
                    <strong>${opp.reachOutTo}</strong> (~$${
                      opp.likelyMMDollarWealth
                    }M) - <em>${opp.contactDetails?.role || 'Role not specified'}</em>
                </div>`
              )
              .join('')}
        </td>
    </tr>
  `
      : ''

  const reasoningHtml = ai_assessment_reason
    ? `
    <tr>
        <td style="padding: 16px 0 0; border-top: 1px solid #444444;">
            <p style="margin:0; font-size: 12px; color: #a0a0a0; font-style: italic;">
                <strong>AI Assessment:</strong> ${ai_assessment_reason}
            </p>
        </td>
    </tr>
  `
    : ''

  const sourcesHtml = (source_articles || [])
    .map(
      (article) => `
    <tr>
        <td style="padding: 4px 0;">
            <a href="${article.link}" style="color: #a0a0a0; text-decoration: none; font-size: 13px;">
                ${article.newspaper}: ${article.headline}
            </a>
        </td>
    </tr>
  `
    )
    .join('')

  return `
    <div style="background-color: #1E1E1E; border-radius: 12px; margin-bottom: 25px; padding: 25px; border: 1px solid #333333; box-shadow: 0 10px 25px rgba(0,0,0,0.3);">
        <table role="presentation" style="width:100%;border-collapse:collapse;border:0;border-spacing:0;">
            <!-- Score & Headline -->
            <tr>
                <td style="padding-bottom: 15px;">
                    <table role="presentation" style="width:100%;border-collapse:collapse;border:0;border-spacing:0;">
                        <tr>
                            <td style="width: 60px; vertical-align: top;" valign="top">
                                <p style="font-size: 28px; font-weight: 700; color: ${scoreColor}; margin: 0; text-shadow: ${scoreTextShadow};">${highest_relevance_score}</p>
                                <p style="font-size: 12px; color: #a0a0a0; margin: 0;">Score</p>
                                ${classificationHtml}
                            </td>
                            <td style="padding-left: 20px;">
                                <h2 style="margin:0; font-size: 20px; font-weight: 600; color: #EAEAEA; line-height: 1.4;">${synthesized_headline}${formatEnrichmentSources(enrichmentSources)}</h2>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            <!-- Summary -->
            <tr>
                <td style="padding-bottom: 20px;">
                    <p style="margin:0; font-size: 16px; color: #cccccc; line-height: 1.7;">${synthesized_summary}</p>
                </td>
            </tr>
            
            ${opportunitiesHtml}
            
            <!-- Sources -->
            <tr>
                <td style="padding: 16px 0 8px; border-top: 1px solid #444444;">
                    <p style="margin:0; font-size: 14px; color: #D4AF37; font-weight: 600;">Source Articles</p>
                </td>
            </tr>
            <tr>
              <td>
                <table role="presentation" style="width:100%;border-collapse:collapse;border:0;border-spacing:0;">${sourcesHtml}</table>
              </td>
            </tr>
            ${reasoningHtml}
        </table>
    </div>
    `
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
