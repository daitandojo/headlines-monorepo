// packages/pipeline/src/pipeline/submodules/opportunityUpserter.js
import { Opportunity, SynthesizedEvent, WatchlistEntity } from '@headlines/models'
import { logger } from '@headlines/utils-shared'
import {
  contactFinderChain,
  entityCanonicalizerChain,
  generateEmbedding,
  opportunityChain,
  dossierUpdateChain,
} from '@headlines/ai-services'
import { getConfig } from '@headlines/scraper-logic/config.js'
import { truncateString } from '@headlines/utils-shared'
import { settings } from '@headlines/config'
import mongoose from 'mongoose'

function sanitizeForJSON(obj) {
  if (obj === null || obj === undefined) return obj
  if (obj._bsontype === 'ObjectId' || obj.constructor?.name === 'ObjectId')
    return obj.toString()
  if (obj instanceof Date) return obj.toISOString()
  if (Array.isArray(obj)) return obj.map((item) => sanitizeForJSON(item))
  if (typeof obj === 'object') {
    const sanitized = {}
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeForJSON(value)
    }
    return sanitized
  }
  return obj
}

async function selfCorrectWatchlist(opportunityName, canonicalName) {
  if (opportunityName.toLowerCase() === canonicalName.toLowerCase()) return
  try {
    const watchlistEntity = await WatchlistEntity.findOne({ name: canonicalName })
    if (!watchlistEntity) return
    const newSearchTerm = opportunityName.toLowerCase().trim()
    if (!watchlistEntity.searchTerms.includes(newSearchTerm)) {
      watchlistEntity.searchTerms.push(newSearchTerm)
      await watchlistEntity.save()
      logger.info(
        `[Self-Correct] Added search term '${newSearchTerm}' to watchlist entity '${canonicalName}'`
      )
    }
  } catch (error) {
    logger.error({ err: error }, '[Self-Correct] Failed to update watchlist')
  }
}

function generateContactSearchQueries(person) {
  const queries = [`"${person.reachOutTo}" contact information`]
  if (person.contactDetails?.company) {
    queries.unshift(
      `"${person.reachOutTo}" ${person.contactDetails.company} email address`
    )
  }
  return queries
}

async function performContactSearches(queries, utilityFunctions) {
  let combinedSnippets = ''
  for (const query of queries) {
    try {
      const searchResult = await utilityFunctions.performGoogleSearch(query)
      if (searchResult.success && searchResult.snippets) {
        combinedSnippets += `\n--- Results for query: "${query}" ---\n${searchResult.snippets}`
      }
    } catch (error) {
      logger.warn({ err: error, query }, '[Contact Research] Search failed')
    }
  }
  return combinedSnippets
}

async function findContactEmail(person) {
  const config = getConfig()
  logger.info(`[Contact Research] Initiated for: ${person.reachOutTo}`)
  try {
    const queries = generateContactSearchQueries(person)
    const combinedSnippets = await performContactSearches(
      queries,
      config.utilityFunctions
    )
    if (!combinedSnippets) {
      logger.warn(`[Contact Research] No search results for "${person.reachOutTo}".`)
      return null
    }
    const response = await contactFinderChain({ snippets: combinedSnippets })
    if (response.error || !response.email) {
      logger.warn(
        `[Contact Research] LLM failed to extract email for "${person.reachOutTo}".`
      )
      return null
    }
    logger.info(
      { email: response.email },
      `[Contact Research] Found email for "${person.reachOutTo}"`
    )
    return response.email
  } catch (error) {
    logger.error(
      { err: error, person: person.reachOutTo },
      '[Contact Research] Failed to find contact email'
    )
    return null
  }
}

function buildIndividualsMapFromOpportunities(opportunities, savedEvents) {
  const individualsMap = new Map()
  for (const opp of opportunities) {
    const matchingEvent = savedEvents.find((e) => e.event_key === opp.event_key)
    if (matchingEvent) {
      const normalizedName = opp.reachOutTo.toLowerCase()
      individualsMap.set(normalizedName, {
        name: opp.reachOutTo,
        event: matchingEvent,
      })
    }
  }
  return individualsMap
}

function addIndividualsFromEvents(savedEvents, existingMap) {
  for (const event of savedEvents) {
    for (const individual of event.key_individuals || []) {
      const normalizedName = individual.name.toLowerCase()
      if (!existingMap.has(normalizedName)) {
        existingMap.set(normalizedName, { name: individual.name, event: event })
      }
    }
  }
  return existingMap
}

async function fetchExistingOpportunities(names) {
  if (names.length === 0) return new Map()
  const existingOpportunities = await Opportunity.find({
    reachOutTo: { $in: names },
  }).lean()
  logger.info(
    `Found ${existingOpportunities.length} existing Opportunity profiles for ${names.length} unique individuals`
  )
  return new Map(existingOpportunities.map((o) => [o.reachOutTo.toLowerCase(), o]))
}

function buildIntelligenceText(event) {
  return `Event Key: ${event.event_key}\nSynthesized Event Headline: ${event.synthesized_headline}\nSynthesized Event Summary: ${event.synthesized_summary}`
}

// --- START OF DEFINITIVE FIX ---
// The previous logic used a complex AI chain to merge JSON, which was slow and caused timeouts.
// This new hybrid approach is faster and more reliable.
async function updateExistingOpportunity(name, existingProfile, event) {
  logger.info(
    `[Hybrid Dossier Update] Updating existing profile for ${name} with new event info...`
  )
  try {
    // Step 1: Deterministic Merge for structured data
    const updatedOpp = { ...existingProfile }
    updatedOpp.whyContact = [
      ...new Set([...(updatedOpp.whyContact || []), buildIntelligenceText(event)]),
    ]
    updatedOpp.events = [
      ...new Set([...(updatedOpp.events || []).map(String), event._id.toString()]),
    ]
    updatedOpp.lastKnownEventLiquidityMM = Math.max(
      updatedOpp.lastKnownEventLiquidityMM || 0,
      event.transactionDetails?.liquidityFlow?.approxAmountUSD || 0
    )

    // Step 2: Use AI ONLY for unstructured text synthesis (the biography)
    if (existingProfile.profile?.biography) {
      const dossierUpdateInput = {
        existing_dossier_json: JSON.stringify({
          biography: existingProfile.profile.biography,
        }),
        new_intelligence_text: buildIntelligenceText(event),
      }
      const result = await dossierUpdateChain(dossierUpdateInput)
      if (result && !result.error && result.opportunities?.[0]?.profile?.biography) {
        updatedOpp.profile.biography = result.opportunities[0].profile.biography
        logger.info(`  -> AI successfully synthesized new biography for ${name}.`)
      } else {
        logger.warn(
          `  -> AI biography synthesis failed for ${name}. Appending new info manually.`
        )
        updatedOpp.profile.biography += `\n\nUpdate (${new Date().toISOString()}): ${buildIntelligenceText(event)}`
      }
    }

    updatedOpp.event_key = event.event_key
    return updatedOpp
  } catch (error) {
    logger.error(
      { err: error, name, eventKey: event.event_key },
      '[Hybrid Dossier Update] Failed to update opportunity'
    )
    return null
  }
}
// --- END OF DEFINITIVE FIX ---

async function createNewOpportunity(name, event) {
  logger.info(`[Opportunity Agent] Creating new profile for ${name}...`)
  try {
    const intelligenceText = buildIntelligenceText(event)
    const opportunityInput = {
      context_text: intelligenceText,
      existing_wealth_profile: null,
    }
    const opportunityResult = await opportunityChain(opportunityInput)
    if (
      opportunityResult &&
      opportunityResult.opportunities &&
      opportunityResult.opportunities.length > 0
    ) {
      return opportunityResult.opportunities
    }
    logger.warn(`[Opportunity Agent] Failed to create profile for ${name}`)
    return []
  } catch (error) {
    logger.error(
      { err: error, name, eventKey: event.event_key },
      '[Opportunity Agent] Failed to create opportunity'
    )
    return []
  }
}

async function generateOpportunities(individualsMap, existingOppMap) {
  const allGeneratedOpportunities = []
  for (const { name, event } of individualsMap.values()) {
    const existingProfile = existingOppMap.get(name.toLowerCase()) || null
    let opportunities
    if (existingProfile) {
      const updated = await updateExistingOpportunity(name, existingProfile, event)
      opportunities = updated ? [updated] : []
    } else {
      opportunities = await createNewOpportunity(name, event)
    }
    if (opportunities.length > 0) {
      allGeneratedOpportunities.push(...opportunities)
    }
  }
  return allGeneratedOpportunities
}

async function canonicalizeOpportunityNames(opportunities) {
  return Promise.all(
    opportunities.map(async (opp) => {
      try {
        const originalName = opp.reachOutTo
        const response = await entityCanonicalizerChain({ entity_name: originalName })
        if (response && !response.error && response.canonical_name) {
          opp.reachOutTo = response.canonical_name
          await selfCorrectWatchlist(originalName, response.canonical_name)
        }
      } catch (error) {
        logger.warn(
          { err: error, name: opp.reachOutTo },
          '[Canonicalization] Failed to canonicalize name'
        )
      }
      return opp
    })
  )
}

async function enrichWithContactEmails(opportunities) {
  return Promise.all(
    opportunities.map(async (opp) => {
      if (!opp.contactDetails?.email) {
        try {
          const email = await findContactEmail(opp)
          if (email) {
            opp.contactDetails.email = email
          }
        } catch (error) {
          logger.warn(
            { err: error, name: opp.reachOutTo },
            '[Contact Enrichment] Failed to find email'
          )
        }
      }
      return opp
    })
  )
}

function buildEmbeddingText(opp) {
  const textParts = [
    opp.reachOutTo,
    ...(Array.isArray(opp.whyContact) ? opp.whyContact : [opp.whyContact]),
    opp.contactDetails?.company,
    opp.profile?.wealthOrigin,
    opp.profile?.biography,
    ...(opp.profile?.investmentInterests || []),
  ]
  return textParts.filter(Boolean).join('; ')
}

async function generateOpportunityEmbeddings(opportunities) {
  return Promise.all(
    opportunities.map(async (opp) => {
      try {
        const textToEmbed = buildEmbeddingText(opp)
        const embedding = await generateEmbedding(textToEmbed)
        return { ...opp, embedding }
      } catch (error) {
        logger.warn(
          { err: error, name: opp.reachOutTo },
          '[Embedding] Failed to generate embedding'
        )
        return opp
      }
    })
  )
}

function buildOpportunityUpdateOperation(opp) {
  const { createdAt, updatedAt, __v, _id, reachOutTo, ...restOfOpp } = opp
  const update = {
    $setOnInsert: { reachOutTo: opp.reachOutTo, createdAt: new Date() },
    $set: {},
    $addToSet: {},
    $max: {},
  }
  for (const [key, value] of Object.entries(restOfOpp)) {
    if (value === null || value === undefined) continue
    switch (key) {
      case 'whyContact':
      case 'events':
        if (Array.isArray(value) && value.length > 0) {
          update.$addToSet[key] = {
            $each: value.map((v) =>
              mongoose.Types.ObjectId.isValid(v) ? new mongoose.Types.ObjectId(v) : v
            ),
          }
        }
        break
      case 'lastKnownEventLiquidityMM':
        update.$max[key] = value
        break
      case 'profile':
        if (typeof value === 'object' && value !== null) {
          const { estimatedNetWorthMM, ...otherProfileFields } = value
          for (const [profKey, profVal] of Object.entries(otherProfileFields)) {
            if (profVal !== null && profVal !== undefined) {
              update.$set[`profile.${profKey}`] = profVal
            }
          }
          if (estimatedNetWorthMM !== null && estimatedNetWorthMM !== undefined) {
            update.$max['profile.estimatedNetWorthMM'] = estimatedNetWorthMM
          }
        }
        break
      default:
        update.$set[key] = value
        break
    }
  }
  if (Object.keys(update.$set).length === 0) delete update.$set
  if (Object.keys(update.$addToSet).length === 0) delete update.$addToSet
  if (Object.keys(update.$max).length === 0) delete update.$max
  return {
    updateOne: {
      filter: { reachOutTo: opp.reachOutTo },
      update,
      upsert: true,
    },
  }
}

async function upsertOpportunities(opportunities) {
  if (opportunities.length === 0) return []
  try {
    const bulkOps = opportunities.map(buildOpportunityUpdateOperation)
    await Opportunity.bulkWrite(bulkOps, { ordered: false })
    logger.info(
      `Successfully sent ${opportunities.length} upsert operations to database.`
    )
    const names = opportunities.map((o) => o.reachOutTo)
    const savedDocs = await Opportunity.find({ reachOutTo: { $in: names } }).lean()
    logger.info(
      `Successfully fetched ${savedDocs.length} upserted opportunities from database.`
    )
    return savedDocs
  } catch (error) {
    logger.error({ err: error }, '[Upsert] Failed to upsert opportunities')
    throw error
  }
}

function buildOpportunityIdMap(opportunities) {
  return new Map(opportunities.map((o) => [o.reachOutTo.toLowerCase(), o._id]))
}

function createLinkOperations(savedEvents, opportunityIdMap) {
  const eventLinkOps = []
  const oppLinkOps = []
  for (const event of savedEvents) {
    for (const individual of event.key_individuals || []) {
      const opportunityId = opportunityIdMap.get(individual.name.toLowerCase())
      if (opportunityId) {
        eventLinkOps.push({
          updateOne: {
            filter: { _id: event._id },
            update: { $addToSet: { relatedOpportunities: opportunityId } },
          },
        })
        oppLinkOps.push({
          updateOne: {
            filter: { _id: opportunityId },
            update: { $addToSet: { events: event._id } },
          },
        })
      }
    }
  }
  return { eventLinkOps, oppLinkOps }
}

async function linkOpportunitiesAndEvents(savedEvents, opportunities) {
  if (opportunities.length === 0) {
    logger.info('[Linking] No opportunities to link to events')
    return
  }
  try {
    const opportunityIdMap = buildOpportunityIdMap(opportunities)
    const { eventLinkOps, oppLinkOps } = createLinkOperations(
      savedEvents,
      opportunityIdMap
    )
    if (oppLinkOps.length > 0) {
      await Promise.all([
        Opportunity.bulkWrite(oppLinkOps, { ordered: false }),
        SynthesizedEvent.bulkWrite(eventLinkOps, { ordered: false }),
      ])
      logger.info(
        `Successfully linked ${oppLinkOps.length} relationships between events and opportunities`
      )
    } else {
      logger.info('[Linking] No new relationships to link')
    }
  } catch (error) {
    logger.error({ err: error }, '[Linking] Failed to link opportunities and events')
  }
}

export async function enrichAndLinkOpportunities(potentialOpportunities, savedEvents) {
  logger.trace(
    {
      potentialOpportunities: (potentialOpportunities || []).map((o) => o.reachOutTo),
      savedEvents: (savedEvents || []).map((e) => e.event_key),
    },
    'enrichAndLinkOpportunities received'
  )

  if (!Array.isArray(savedEvents) || savedEvents.length === 0) {
    logger.warn(
      '[CRITICAL] No saved events provided to enrichAndLinkOpportunities. Cannot process opportunities.'
    )
    return []
  }

  const individualsMap = buildIndividualsMapFromOpportunities(
    potentialOpportunities,
    savedEvents
  )
  addIndividualsFromEvents(savedEvents, individualsMap)

  if (individualsMap.size === 0) {
    logger.info(
      'No key individuals found in approved events. Skipping opportunity creation.'
    )
    return []
  }

  logger.info(`Identified ${individualsMap.size} unique individuals for processing`)

  const names = Array.from(individualsMap.values()).map((p) => p.name)
  const existingOppMap = await fetchExistingOpportunities(names)

  const generatedOpportunities = await generateOpportunities(
    individualsMap,
    existingOppMap
  )

  let finalOpportunityDocs = []

  if (generatedOpportunities.length === 0) {
    logger.info(
      'AI Agents generated no new or updated opportunities. Linking events to existing profiles.'
    )
    finalOpportunityDocs = Array.from(existingOppMap.values())
  } else {
    logger.info(
      `AI Agents generated/updated ${generatedOpportunities.length} opportunities for processing`
    )

    const canonicalizedOpportunities =
      await canonicalizeOpportunityNames(generatedOpportunities)
    const enrichedOpportunities = await enrichWithContactEmails(
      canonicalizedOpportunities
    )
    const opportunitiesWithEmbeddings =
      await generateOpportunityEmbeddings(enrichedOpportunities)
    finalOpportunityDocs = await upsertOpportunities(opportunitiesWithEmbeddings)
  }

  await linkOpportunitiesAndEvents(savedEvents, finalOpportunityDocs)

  logger.info(
    `[Enrichment Complete] Returning ${finalOpportunityDocs.length} opportunity documents`
  )

  return finalOpportunityDocs
}
