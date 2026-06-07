// apps/pipeline/src/pipeline/submodules/scoringEngine.js
import { logger } from '@headlines/utils-shared'

/**
 * Computes a composite likelihood-to-transact score (0-100) for an individual
 * based on signals from synthesized events and profile data.
 *
 * @param {Object} individual - { name, role, event, profile }
 * @param {Object} event - Synthesized event with transactionDetails, successionSignals, triggerClass
 * @returns {{ score: number, readiness: string, months: number }}
 */
export function computeTransactionScore(individual, event) {
  let score = 0
  const signals = []

  // 1. Succession signals (+25)
  if (event.successionSignals) {
    if (event.successionSignals.founderAgeOver65) {
      score += 25
      signals.push('founder_over_65')
    }
    if (event.successionSignals.namedHeirApparent) {
      score += 15
      signals.push('heir_apparent_named')
    }
    if (event.successionSignals.externalCEOAppointed) {
      score += 10
      signals.push('external_ceo_appointed')
    }
  }

  // 2. PE/VC involvement (+20)
  if (event.triggerClass === 'TC4_PRIVATE_EQUITY') {
    score += 20
    signals.push('pe_involvement')
  }

  // 3. Pending or rumored status (+15-25)
  if (event.eventStatus === 'Pending') {
    score += 25
    signals.push('pending_transaction')
  } else if (event.eventStatus === 'Rumored') {
    score += 15
    signals.push('rumored_transaction')
  }

  // 4. High-value transaction (+15)
  const amount = event.transactionDetails?.valuationAtEventUSD ||
    event.transactionDetails?.liquidityFlow?.approxAmountUSD
  if (amount && amount > 100) {
    score += 15
    signals.push('high_value_transaction')
  }

  // 5. Recent event (within 6 months) (+10)
  const eventDate = event.createdAt ? new Date(event.createdAt) : new Date()
  const monthsAgo = (Date.now() - eventDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
  if (monthsAgo < 6) {
    score += 10
    signals.push('recent_event')
  }

  // 6. Trigger-specific boosts
  const triggerBoosts = {
    TC1_FAMILY_FOUNDER: 15,
    TC2_MA_BUYER: 20,
    TC3_MA_SELLER: 25,
    TC8_SUCCESSION: 20,
    TC9_IPO: 15,
  }
  if (triggerBoosts[event.triggerClass]) {
    score += triggerBoosts[event.triggerClass]
    signals.push(`trigger_${event.triggerClass}`)
  }

  // 7. Deal status progression (+15 if still active)
  const activeDealStatuses = ['rumor', 'announced', 'pending']
  if (activeDealStatuses.includes(event.dealStatus)) {
    score += 15
    signals.push('active_deal_pipeline')
  }

  const finalScore = Math.min(100, Math.max(0, score))

  let readiness = 'cold'
  let months = 24
  if (finalScore >= 80) {
    readiness = 'urgent'
    months = 3
  } else if (finalScore >= 60) {
    readiness = 'hot'
    months = 6
  } else if (finalScore >= 40) {
    readiness = 'warm'
    months = 12
  }

  return { score: finalScore, readiness, months, signals }
}

/**
 * Batch scores all individuals across all events in a pipeline run.
 */
export function scoreAllIndividuals(assessedCandidates, synthesizedEvents) {
  const personScores = new Map()

  for (const event of synthesizedEvents) {
    const individuals = [
      event.primarySubject,
      ...(event.key_individuals || []),
      ...(event.transactionDetails?.sellerUBOs || []),
      ...(event.transactionDetails?.buyerUBOs || []),
    ].filter(Boolean)

    for (const ind of individuals) {
      const name = ind.name || ind.reachOutTo
      if (!name) continue

      if (!personScores.has(name)) {
        personScores.set(name, { score: 0, events: [] })
      }
      const result = personScores.get(name)
      const computed = computeTransactionScore(ind, event)
      result.score = Math.max(result.score, computed.score)
      result.events.push({
        eventId: event._id,
        headline: event.synthesized_headline,
        score: computed.score,
        readiness: computed.readiness,
        months: computed.months,
      })
    }
  }

  return Array.from(personScores.entries()).map(([name, data]) => ({
    name,
    ...data,
  }))
}

export default { computeTransactionScore, scoreAllIndividuals }