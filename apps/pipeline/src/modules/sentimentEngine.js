// apps/pipeline/src/modules/sentimentEngine.js
// Tier 1.5: Sentiment, Confidence & Decay Engine
// Computes dynamic confidence scores, tracks sentiment trends, applies decay models
import { logger } from '@headlines/utils-shared'
import { Opportunity, SynthesizedEvent, Article } from '@headlines/models'

const DECAY_DAYS = 90
const CORROBORATION_BOOST = 15
const RECENCY_BOOST_DAYS = 7

export async function recomputeAllScores() {
  const opportunities = await Opportunity.find({
    $or: [
      { confidenceScore: { $gt: 0 } },
      { lastSignalDate: { $exists: true } },
      { coolingSince: { $exists: true } },
    ],
  })

  let updated = 0
  for (const opp of opportunities) {
    try {
      const changed = await recomputeSingle(opp)
      if (changed) updated++
    } catch (err) {
      logger.warn({ err: err.message }, `[Sentiment] Failed for ${opp.reachOutTo}`)
    }
  }
  logger.info(`[Sentiment] Re-scored ${opportunities.length} opportunities (${updated} changed)`)
  return { total: opportunities.length, updated }
}

async function recomputeSingle(opp) {
  const now = new Date()
  let score = 0
  let changed = false

  // Base score from corroboration
  const corrCount = opp.corroborationCount || 0
  score += Math.min(corrCount * CORROBORATION_BOOST, 40)

  // Recency boost: events within 7 days
  if (opp.lastSignalDate) {
    const daysSince = (now - new Date(opp.lastSignalDate)) / (1000 * 60 * 60 * 24)
    if (daysSince <= RECENCY_BOOST_DAYS) {
      score += Math.max(0, 30 - (daysSince / RECENCY_BOOST_DAYS) * 30)
    }
  }

  // Decay: cooling period penalty
  if (opp.coolingSince) {
    const coolingDays = (now - new Date(opp.coolingSince)) / (1000 * 60 * 60 * 24)
    score = Math.max(0, score - coolingDays * 2)
  }

  // Event status boost
  const recentEvents = await SynthesizedEvent.find({
    relatedOpportunities: opp._id,
    createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
  }).select('dealStatus event_key createdAt').lean()

  if (recentEvents.length === 0 && opp.lastSignalDate) {
    const daysSince = (now - new Date(opp.lastSignalDate)) / (1000 * 60 * 60 * 24)
    if (daysSince > DECAY_DAYS && !opp.coolingSince) {
      await Opportunity.updateOne(
        { _id: opp._id },
        { $set: { coolingSince: now, priority: 'low' } }
      )
      changed = true
      return changed
    }
    if (daysSince > DECAY_DAYS) {
      score = Math.max(0, score - 50)
    }
  }

  for (const ev of recentEvents) {
    if (ev.dealStatus === 'completed') score += 10
    if (ev.dealStatus === 'pending') score += 20
    if (ev.dealStatus === 'announced') score += 15
    if (ev.dealStatus === 'rumor') score += 5
  }

  // Sentiment from past events
  if (opp.sentimentTrend?.length) {
    const recentSentiments = opp.sentimentTrend.slice(-3)
    const avgSentiment = recentSentiments.reduce((s, t) => s + t.score, 0) / recentSentiments.length
    score += (avgSentiment * 20)
  }

  score = Math.round(Math.max(0, Math.min(100, score)))

  const oldScore = opp.confidenceScore || 0
  const diff = Math.abs(score - oldScore)
  if (diff > 5) {
    const oldPriority = opp.priority
    const newPriority = score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low'
    const old = opp.coolingSince

    await Opportunity.updateOne(
      { _id: opp._id },
      {
        $set: {
          confidenceScore: score,
          priority: newPriority,
          coolingSince: score < 20 && !opp.coolingSince ? now : score >= 30 ? null : opp.coolingSince,
        },
      }
    )
    changed = true
  }

  return changed
}

export async function recordSignal(opportunityId, score, source) {
  await Opportunity.updateOne(
    { _id: opportunityId },
    {
      $push: {
        sentimentTrend: {
          date: new Date(),
          score,
          source,
        },
      },
      $set: { lastSignalDate: new Date() },
      $inc: { corroborationCount: 1, confidenceScore: 10 },
    }
  )
}

export async function getSentimentSummary() {
  const all = await Opportunity.find({ confidenceScore: { $gt: 0 } }).select('reachOutTo confidenceScore priority coolingSince sentimentTrend').lean()
  const hot = all.filter(o => o.confidenceScore >= 60)
  const warm = all.filter(o => o.confidenceScore >= 30 && o.confidenceScore < 60)
  const cold = all.filter(o => o.confidenceScore < 30 && o.confidenceScore > 0)
  const cooled = all.filter(o => o.coolingSince)
  return { total: all.length, hot: hot.length, warm: warm.length, cold: cold.length, cooled: cooled.length }
}