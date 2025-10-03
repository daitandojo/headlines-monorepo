// apps/pipeline/src/pipeline/submodules/opportunityUpserter.js (version 7.1.0)
import { Opportunity, SynthesizedEvent, WatchlistEntity } from '@headlines/models'
import { logger } from '@headlines/utils-shared'
import {
  contactFinderChain,
  entityCanonicalizerChain,
  generateEmbedding,
} from '@headlines/ai-services'
import { getConfig } from '@headlines/scraper-logic/config.js'

async function selfCorrectWatchlist(opportunityName, canonicalName) {
  if (opportunityName.toLowerCase() === canonicalName.toLowerCase()) return

  const watchlistEntity = await WatchlistEntity.findOne({ name: canonicalName })
  if (watchlistEntity) {
    const newSearchTerm = opportunityName.toLowerCase().trim()
    if (!watchlistEntity.searchTerms.includes(newSearchTerm)) {
      watchlistEntity.searchTerms.push(newSearchTerm)
      await watchlistEntity.save()
      logger.info(
        `[Self-Correct] Added search term '${newSearchTerm}' to watchlist entity '${canonicalName}'.`
      )
    }
  }
}

async function findContactEmail(person) {
  const config = getConfig()
  logger.info(`[Contact Research] Initiated for: ${person.reachOutTo}`)
  const queries = [
    `"${person.reachOutTo}" ${person.contactDetails.company} email address`,
    `"${person.reachOutTo}" contact information`,
  ]

  let combinedSnippets = ''
  for (const query of queries) {
    const searchResult = await config.utilityFunctions.performGoogleSearch(query)
    if (searchResult.success && searchResult.snippets) {
      combinedSnippets += `\n--- Results for query: "${query}" ---\n${searchResult.snippets}`
    }
  }

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
    `[Contact Research] Found email for "${person.reachOutTo}".`
  )
  return response.email
}

export async function enrichAndLinkOpportunities(potentialOpportunities, savedEvents) {
  if (!potentialOpportunities || potentialOpportunities.length === 0) {
    return []
  }

  logger.info(
    `--- Opportunity Enrichment & Linking: Processing ${potentialOpportunities.length} potential opportunities... ---`
  )

  const canonicalizedOpportunities = await Promise.all(
    potentialOpportunities.map(async (opp) => {
      const originalName = opp.reachOutTo
      // DEFINITIVE FIX: Changed from .invoke to direct await
      const response = await entityCanonicalizerChain({
        entity_name: originalName,
      })
      if (response && !response.error && response.canonical_name) {
        opp.reachOutTo = response.canonical_name
        await selfCorrectWatchlist(originalName, response.canonical_name)
      }
      return opp
    })
  )

  const enrichedOpportunities = await Promise.all(
    canonicalizedOpportunities.map(async (opp) => {
      if (!opp.contactDetails.email) {
        const email = await findContactEmail(opp)
        if (email) {
          opp.contactDetails.email = email
        }
      }
      return opp
    })
  )

  const enrichedOpportunitiesWithEmbeddings = await Promise.all(
    enrichedOpportunities.map(async (opp) => {
      const textToEmbed = [
        opp.reachOutTo,
        ...(Array.isArray(opp.whyContact) ? opp.whyContact : [opp.whyContact]),
        opp.contactDetails?.company,
      ]
        .filter(Boolean)
        .join('; ')

      const embedding = await generateEmbedding(textToEmbed)
      return { ...opp, embedding }
    })
  )

  const findOrCreateOps = enrichedOpportunitiesWithEmbeddings.map((opp) => {
    const whyContactArray = Array.isArray(opp.whyContact)
      ? opp.whyContact
      : [opp.whyContact]
    return {
      updateOne: {
        filter: { reachOutTo: opp.reachOutTo },
        update: {
          $setOnInsert: {
            reachOutTo: opp.reachOutTo,
            basedIn: opp.basedIn,
            likelyMMDollarWealth: opp.likelyMMDollarWealth,
            contactDetails: opp.contactDetails,
          },
          $set: {
            embedding: opp.embedding,
          },
          $addToSet: { whyContact: { $each: whyContactArray } },
        },
        upsert: true,
      },
    }
  })

  if (findOrCreateOps.length > 0) {
    await Opportunity.bulkWrite(findOrCreateOps, { ordered: false })
  }

  const allOppNames = enrichedOpportunitiesWithEmbeddings.map((o) => o.reachOutTo)
  const allOpportunityDocs = await Opportunity.find({ reachOutTo: { $in: allOppNames } })
  const oppMap = new Map(allOpportunityDocs.map((o) => [o.reachOutTo, o]))
  const eventMap = new Map(savedEvents.map((e) => [e.event_key, e]))

  const oppLinkOps = []
  const eventLinkOps = []

  for (const enrichedOpp of enrichedOpportunitiesWithEmbeddings) {
    const opportunityDoc = oppMap.get(enrichedOpp.reachOutTo)
    const eventDoc = eventMap.get(enrichedOpp.event_key)
    if (opportunityDoc && eventDoc) {
      eventLinkOps.push({
        updateOne: {
          filter: { _id: eventDoc._id },
          update: { $addToSet: { relatedOpportunities: opportunityDoc._id } },
        },
      })
      oppLinkOps.push({
        updateOne: {
          filter: { _id: opportunityDoc._id },
          update: {
            $addToSet: { events: eventDoc._id },
            $max: { likelyMMDollarWealth: enrichedOpp.likelyMMDollarWealth },
          },
        },
      })
    }
  }

  if (oppLinkOps.length > 0) {
    await Promise.all([
      Opportunity.bulkWrite(oppLinkOps, { ordered: false }),
      SynthesizedEvent.bulkWrite(eventLinkOps, { ordered: false }),
    ])
    logger.info(
      `Successfully linked ${oppLinkOps.length} opportunity-event relationships.`
    )
  }

  return Opportunity.find({ _id: { $in: allOpportunityDocs.map((o) => o._id) } }).lean()
}
