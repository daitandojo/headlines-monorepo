// apps/pipeline/src/modules/dataStore/index.js
import { Pinecone } from '@pinecone-database/pinecone'
import { logger } from '@headlines/utils-shared'
import { generateEmbedding } from '@headlines/ai-services'
import { env } from '@headlines/config'
import { Opportunity, SynthesizedEvent } from '@headlines/models'
import {
  bulkWriteEvents,
  bulkWriteArticles,
  findEventsByKeys,
  findArticlesByLinks,
  findArticles,
} from '@headlines/data-access'

const { PINECONE_API_KEY, PINECONE_INDEX_NAME } = env

if (!PINECONE_API_KEY) throw new Error('Pinecone API Key is missing!')
const pc = new Pinecone({ apiKey: PINECONE_API_KEY })
const pineconeIndex = pc.index(PINECONE_INDEX_NAME)

/**
 * Saves pipeline results to MongoDB and Pinecone
 * @param {Array} articlesToSave - Articles to upsert
 * @param {Array} eventsToSave - Events to upsert
 * @returns {Promise<Object>} Result with savedEvents array
 */
export async function savePipelineResults(articlesToSave, eventsToSave) {
  logger.info(`Committing pipeline results to databases (MongoDB & Pinecone)...`)
  let savedEvents = []
  const pineconeVectors = []

  try {
    // ===== STEP 1: Save Events (RE-ARCHITECTED FOR RELIABILITY) =====
    if (eventsToSave && eventsToSave.length > 0) {
      // --- START OF DEFINITIVE, FINAL FIX ---
      // Abandoning bulkWrite for events. It is too unreliable for upserts where no changes occur.
      // This new loop uses findOneAndUpdate, which is atomic and GUARANTEES the document is returned,
      // solving the root cause of all downstream failures.
      let upsertedCount = 0
      let modifiedCount = 0
      for (const event of eventsToSave) {
        const cleanEventPayload =
          typeof event.toObject === 'function' ? event.toObject() : { ...event }

        delete cleanEventPayload._id
        delete cleanEventPayload.__v
        delete cleanEventPayload.createdAt

        cleanEventPayload.emailed = false
        cleanEventPayload.updatedAt = new Date()

        const result = await SynthesizedEvent.findOneAndUpdate(
          { event_key: event.event_key },
          {
            $set: cleanEventPayload,
            $setOnInsert: { createdAt: new Date() },
          },
          { upsert: true, new: true, runValidators: true, lean: true }
        )
        if (result) {
          savedEvents.push(result)
          // Check if it was an insert or an update for logging
          if (result.createdAt.getTime() === result.updatedAt.getTime()) {
            upsertedCount++
          } else {
            modifiedCount++
          }
        }
      }
      logger.info(
        `MongoDB Event commit complete. Upserted: ${upsertedCount}, Modified: ${modifiedCount}.`
      )
      // --- END OF DEFINITIVE, FINAL FIX ---

      // Create Pinecone vectors for events
      for (const event of savedEvents) {
        const textToEmbed = `${event.synthesized_headline}\n${event.synthesized_summary}`
        const embedding = await generateEmbedding(textToEmbed)
        const eventDate = new Date(event.createdAt || Date.now())

        pineconeVectors.push({
          id: `event_${event._id.toString()}`,
          values: embedding,
          metadata: {
            type: 'event',
            headline: event.synthesized_headline,
            summary: event.synthesized_summary,
            country: Array.isArray(event.country)
              ? event.country.join(', ')
              : event.country,
            event_date: eventDate.toISOString(),
            key_individuals: (event.key_individuals || []).map((p) => p.name).join(', '),
            transactionType: event.transactionDetails?.transactionType || 'N/A',
            valuationUSD: event.transactionDetails?.valuationAtEventUSD || 0,
            tags: event.tags || [],
          },
        })
      }
    }

    // ===== STEP 2: Save Articles =====
    if (articlesToSave && articlesToSave.length > 0) {
      const articleOps = []
      const eventKeyToIdMap = new Map(savedEvents.map((e) => [e.event_key, e._id]))
      const articleIdToEventKeyMap = new Map()

      for (const event of eventsToSave) {
        for (const sourceArticle of event.source_articles) {
          const article = articlesToSave.find((a) => a.link === sourceArticle.link)
          if (article) {
            articleIdToEventKeyMap.set(article._id.toString(), event.event_key)
          }
        }
      }

      for (const article of articlesToSave) {
        if (article.relevance_article && article.assessment_article) {
          const textToEmbed = `${article.headline}\n${article.assessment_article}`
          article.embedding = await generateEmbedding(textToEmbed)
        }
        const articleIdStr = article._id.toString()
        if (article.embedding) {
          pineconeVectors.push({
            id: `article_${articleIdStr}`,
            values: article.embedding,
            metadata: {
              type: 'article',
              headline: article.headline,
              summary: article.assessment_article || 'No summary.',
              newspaper: article.newspaper,
              country: Array.isArray(article.country)
                ? article.country.join(', ')
                : article.country,
            },
          })
        }
        const eventKey = articleIdToEventKeyMap.get(articleIdStr)
        if (eventKey) {
          article.synthesizedEventId = eventKeyToIdMap.get(eventKey)
        }
        const { _id, ...dataToSet } = article
        delete dataToSet.articleContent
        delete dataToSet.embedding
        Object.keys(dataToSet).forEach(
          (key) => dataToSet[key] === undefined && delete dataToSet[key]
        )
        articleOps.push({
          updateOne: {
            filter: { link: article.link },
            update: { $set: dataToSet },
            upsert: true,
          },
        })
      }
      await bulkWriteArticles(articleOps)
      logger.info(
        `MongoDB Article commit complete. Upserted/Modified: ${articleOps.length}.`
      )
    }

    // ===== STEP 3: Upsert to Pinecone =====
    if (pineconeVectors.length > 0) {
      await pineconeIndex.upsert(pineconeVectors)
      logger.info(`Pinecone commit complete. Upserted ${pineconeVectors.length} vectors.`)
    }

    return { success: true, savedEvents }
  } catch (error) {
    logger.fatal(
      { err: error },
      'CRITICAL: Failed to commit pipeline results to the databases.'
    )
    return { success: false, savedEvents: [] }
  }
}

export async function saveOpportunitiesToPinecone(savedOpportunities) {
  if (!savedOpportunities || savedOpportunities.length === 0) {
    logger.info('No opportunities to save to Pinecone.')
    return true
  }
  try {
    const pineconeVectors = []
    const opportunityDocs = await Opportunity.find({
      _id: { $in: savedOpportunities.map((o) => o._id) },
    }).lean()
    for (const opp of opportunityDocs) {
      if (opp.embedding && opp.embedding.length > 0) {
        pineconeVectors.push({
          id: `opportunity_${opp._id.toString()}`,
          values: opp.embedding,
          metadata: {
            type: 'opportunity',
            headline: opp.reachOutTo,
            summary:
              (Array.isArray(opp.whyContact)
                ? opp.whyContact.join(' ')
                : opp.whyContact) || '',
            country: Array.isArray(opp.basedIn) ? opp.basedIn.join(', ') : opp.basedIn,
            wealthOrigin: opp.profile?.wealthOrigin || 'N/A',
          },
        })
      }
    }
    if (pineconeVectors.length > 0) {
      await pineconeIndex.upsert(pineconeVectors)
      logger.info(
        `Pinecone opportunity commit complete. Upserted ${pineconeVectors.length} opportunity vectors.`
      )
    }
    return true
  } catch (error) {
    logger.error({ err: error }, 'Failed to save opportunities to Pinecone')
    return false
  }
}

export async function filterFreshArticles(articles, isRefreshMode = false) {
  if (!articles || articles.length === 0) return []
  const scrapedLinks = articles.map((a) => a.link)

  if (isRefreshMode) {
    logger.warn('REFRESH MODE: All scraped articles will be re-processed.')
    const result = await findArticles({
      filter: { link: { $in: scrapedLinks } },
    })
    if (!result.success) throw new Error(result.error)
    const existingArticlesMap = new Map(result.data.map((a) => [a.link, a]))
    return articles.map((scrapedArticle) => {
      const existingArticle = existingArticlesMap.get(scrapedArticle.link)
      return existingArticle || scrapedArticle
    })
  }

  const result = await findArticlesByLinks(scrapedLinks)
  if (!result.success) throw new Error(result.error)
  const existingLinks = new Set(result.data.map((a) => a.link))
  const freshArticles = articles.filter((a) => !existingLinks.has(a.link))
  logger.info(
    `Filtering complete. Found ${existingLinks.size} existing articles, ${freshArticles.length} are fresh.`
  )
  return freshArticles
}
