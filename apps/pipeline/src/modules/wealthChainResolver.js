// apps/pipeline/src/modules/wealthChainResolver.js
// Tier 1.2: Wealth Chain Resolution
// For each transaction event, trace ownership → compute proceeds → update Opportunities
import { logger } from '@headlines/utils-shared'
import { callKimiModel, isKimiConfigured, callLanguageModel } from '@headlines/ai-services'
import { OwnershipStake, SynthesizedEvent, Opportunity, EntityGraph } from '@headlines/models'

export async function resolveWealthChains(events, runId) {
  const resolved = []
  for (const event of events) {
    try {
      const result = await resolveSingleEvent(event)
      if (result) resolved.push(result)
    } catch (err) {
      logger.warn({ err: err.message }, `[WealthChain] Failed for event ${event.event_key}`)
    }
  }
  logger.info(`[WealthChain] Resolved ${resolved.length}/${events.length} events`)
  return resolved
}

async function resolveSingleEvent(event) {
  const td = event.transactionDetails
  if (!td || !td.valuationAtEventUSD) {
    logger.debug({ eventKey: event.event_key }, '[WealthChain] Skipped: no transactionDetails or valuation')
    return null
  }

  const dealValue = td.valuationAtEventUSD
  const sellerNames = extractSellerNames(event)
  if (sellerNames.length === 0) {
    logger.debug({ eventKey: event.event_key }, '[WealthChain] Skipped: no seller names extracted')
    return null
  }

  const results = []
  for (const seller of sellerNames) {
    const stake = await findOrEstimateStake(seller, event)
    if (!stake) continue

    const proceeds = ((stake.percentage || 0) / 100) * dealValue
    await updateOpportunityWealth(seller, proceeds, event)
    await updateEntityGraphWealth(seller, proceeds, event)
    results.push({ entity: seller, percentage: stake.percentage, proceeds })
  }
  return results
}

function extractSellerNames(event) {
  const names = []
  if (event.transactionDetails?.sellerUBOs?.length) {
    for (const ubo of event.transactionDetails.sellerUBOs) {
      if (ubo.name) names.push(ubo.name)
    }
  }
  if (event.primarySubject?.name) names.push(event.primarySubject.name)
  if (event.key_individuals?.length) {
    for (const ki of event.key_individuals) {
      const role = ki.role_in_event?.toLowerCase() || ''
      if (role.includes('seller') || role.includes('founder') || role.includes('owner') || role.includes('beneficiary') || role.includes('shareholder')) {
        if (ki.name) names.push(ki.name)
      }
    }
  }
  if (event.transactionDetails?.buyerUBOs?.length) {
    for (const ubo of event.transactionDetails.buyerUBOs) {
      if (ubo.name) names.push(ubo.name)
    }
  }
  return [...new Set(names)]
}

async function findOrEstimateStake(sellerName, event) {
  const companyName = event.relatedCompanies?.[0] || event.primarySubject?.role || ''

  const dbStake = await OwnershipStake.findOne({
    entityName: { $regex: new RegExp(sellerName.split(/\s+/).slice(-2).join('|'), 'i') },
    companyName: { $regex: new RegExp(companyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
  }).lean()
  if (dbStake) return dbStake

  if (isKimiConfigured()) {
    try {
      const result = await callKimiModel({
        systemPrompt: 'You are a corporate intelligence analyst. Estimate the ownership percentage of the named individual in the company mentioned. Use web search to find real data. Return JSON: { estimated_percentage (number or null), confidence (low/medium/high), reasoning (string), source_urls (array of strings) }',
        userContent: `Who: ${sellerName}\nCompany: ${companyName}\nDeal context: ${event.synthesized_headline}\nValuation: $${event.transactionDetails?.valuationAtEventUSD}M`,
        isJson: true,
        maxToolRounds: 8,
      })
      if (result && result.estimated_percentage) {
        const stake = new OwnershipStake({
          entityName: sellerName,
          companyName,
          percentage: result.estimated_percentage,
          estimatedValueUSD_MM: ((result.estimated_percentage || 0) / 100) * (event.transactionDetails?.valuationAtEventUSD || 0),
          verifiedDate: new Date(),
          source: `WealthChain: ${event.event_key}`,
          isVerified: false,
          confidence: result.confidence === 'high' ? 80 : result.confidence === 'medium' ? 50 : 20,
        })
        await stake.save()
        return stake
      }
    } catch (err) {
      logger.warn({ err: err.message }, `[WealthChain] Kimi estimate failed for ${sellerName}`)
    }
  }

  return null
}

async function updateOpportunityWealth(sellerName, proceeds, event) {
  const opp = await Opportunity.findOne({
    reachOutTo: { $regex: new RegExp(sellerName.split(/\s+/).slice(-2).join('|'), 'i') },
  })
  if (!opp) return

  const currentTotal = opp.estimatedTotalWealthUSD_MM || 0
  const newTotal = currentTotal + (proceeds || 0)
  const snapshotEntry = {
    company: event.relatedCompanies?.[0] || event.primarySubject?.role || 'Unknown',
    percentage: null,
    estimatedValueUSD_MM: proceeds || 0,
    stakeType: 'direct',
  }

  await Opportunity.updateOne(
    { _id: opp._id },
    {
      $set: {
        estimatedTotalWealthUSD_MM: newTotal,
        lastKnownEventLiquidityMM: Math.max(opp.lastKnownEventLiquidityMM || 0, proceeds || 0),
        lastSignalDate: new Date(),
        confidenceScore: Math.min((opp.confidenceScore || 0) + 10, 100),
        corroborationCount: (opp.corroborationCount || 0) + 1,
      },
      $push: { ownershipStakesSnapshot: snapshotEntry, pastEvents: {
        eventId: event._id,
        headline: event.synthesized_headline,
        date: new Date(),
        type: event.transactionDetails?.transactionType || 'wealth_event',
        amountMM: proceeds || 0,
      } },
    }
  )
  logger.info(`[WealthChain] Updated Opportunity "${sellerName}": +$${proceeds}M (total: $${newTotal}M)`)
}

async function updateEntityGraphWealth(sellerName, proceeds, event) {
  const entity = await EntityGraph.findOne({
    name: { $regex: new RegExp(`^${sellerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
  })
  if (!entity) return
  await EntityGraph.updateOne(
    { _id: entity._id },
    {
      $push: {
        documents: {
          type: 'wealth_event',
          url: event.source_articles?.[0]?.link || '',
          title: event.synthesized_headline,
          timestamp: new Date(),
        },
      },
    }
  )
}

export async function getWealthChainSummary(since) {
  const stakes = await OwnershipStake.find({ updatedAt: { $gte: since || new Date(0) } }).sort({ estimatedValueUSD_MM: -1 }).lean()
  return stakes
}