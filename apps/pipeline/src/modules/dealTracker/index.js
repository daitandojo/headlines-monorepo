// apps/pipeline/src/modules/dealTracker/index.js
import { SynthesizedEvent } from '@headlines/models'
import { logger } from '@headlines/utils-shared'

const DEAL_KEYWORDS = [
  'exploring options', 'strategic review', 'evaluating offers', 'considering sale',
  'hired advisor', 'mandate', 'running a process', 'auction',
  'preparing for ipo', 'confidential information memorandum',
]

const DEAL_STATUS_FLOW = {
  rumor: ['announced', 'cancelled'],
  announced: ['pending', 'completed', 'cancelled'],
  pending: ['completed', 'cancelled'],
}

/**
 * Detects pre-deal signals from raw headline text.
 */
export function detectPreDealSignals(headline, text = '') {
  const combined = `${headline} ${text}`.toLowerCase()
  const signals = []
  for (const keyword of DEAL_KEYWORDS) {
    if (combined.includes(keyword)) {
      signals.push({ signal: keyword, confidence: 70, source: 'keyword_match' })
    }
  }
  return signals
}

/**
 * Validates whether a transition from currentStatus to newStatus is allowed.
 */
function isValidTransition(currentStatus, newStatus) {
  if (!currentStatus) return true
  const allowed = DEAL_STATUS_FLOW[currentStatus]
  return allowed ? allowed.includes(newStatus) : false
}

/**
 * Updates or creates a deal tracking event based on the synthesized event.
 * Merges with existing events by company/entity names if they share a deal context.
 */
export async function trackDealLifecycle(event, relatedCompanies = []) {
  if (!event || !event.eventStatus) return event

  const dealStatus = event.dealStatus || event.eventStatus?.toLowerCase()
  if (!dealStatus || dealStatus === 'completed') return event

  try {
    const searchTerms = [event.primarySubject?.name, ...(relatedCompanies || [])]
      .filter(Boolean)
      .map(t => t.toLowerCase().trim())

    if (searchTerms.length === 0) return event

    // Find existing events that might be the same deal
    const existing = await SynthesizedEvent.find({
      _id: { $ne: event._id },
      triggerClass: event.triggerClass,
      dealStatus: { $in: ['rumor', 'announced', 'pending'] },
      $or: [
        { 'primarySubject.name': { $regex: searchTerms[0], $options: 'i' } },
        { relatedCompanies: { $in: searchTerms } },
      ],
    }).lean().limit(3)

    if (existing.length > 0) {
      const latest = existing.reduce((a, b) =>
        new Date(a.createdAt) > new Date(b.createdAt) ? a : b
      )
      if (isValidTransition(latest.dealStatus, dealStatus)) {
        await SynthesizedEvent.updateOne(
          { _id: latest._id },
          { $set: { dealStatus, dealCloseDate: event.dealCloseDate } }
        )
        logger.info(`[DealTracker] Updated deal ${latest.event_key}: ${latest.dealStatus} → ${dealStatus}`)
      }
    }
  } catch (error) {
    logger.warn(`[DealTracker] Error: ${error.message?.substring(0, 60)}`)
  }

  return event
}

export default { detectPreDealSignals, trackDealLifecycle }