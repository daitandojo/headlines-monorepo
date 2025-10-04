// apps/pipeline/src/modules/dataStore/index.js (CORRECTED - Handles empty articles array)
import { Pinecone } from '@pinecone-database/pinecone'
import { logger } from '@headlines/utils-shared'
import { generateEmbedding } from '@headlines/ai-services'
import { env } from '@headlines/config'
import { Opportunity } from '@headlines/models'
import {
  bulkWriteEvents,
  bulkWriteArticles,
  findEventsByKeys,
  findArticlesByLinks,
} from '@headlines/data-access'

const { PINECONE_API_KEY, PINECONE_INDEX_NAME } = env

if (!PINECONE_API_KEY) throw new Error('Pinecone API Key is missing!')
const pc = new Pinecone({ apiKey: PINECONE_API_KEY })
const pineconeIndex = pc.index(PINECONE_INDEX_NAME)

export async function savePipelineResults(
  articlesToSave, // This may now be an empty array
  eventsToSave,
  savedOpportunities
) {
  logger.info(`Committing pipeline results to databases (MongoDB & Pinecone)...`)

  let savedEvents = []
  const pineconeVectors = []

  try {
    if (eventsToSave && eventsToSave.length > 0) {
      const eventOps = eventsToSave.map((event) => {
        const eventPayload = event.toObject ? event.toObject() : event
        delete eventPayload._id
        return {
          updateOne: {
            filter: { event_key: event.event_key },
            update: { $set: { ...eventPayload, emailed: false } },
            upsert: true,
          },
        }
      })
      const eventResult = await bulkWriteEvents(eventOps)
      if (!eventResult.success) throw new Error(eventResult.error)
      logger.info(
        `MongoDB Event commit complete. Upserted: ${eventResult.upsertedCount}, Modified: ${eventResult.modifiedCount}.`
      )

      const eventKeys = eventsToSave.map((e) => e.event_key)
      const findResult = await findEventsByKeys(eventKeys)
      if (!findResult.success) throw new Error(findResult.error)
      savedEvents = findResult.data

      for (const event of savedEvents) {
        const textToEmbed = `${event.synthesized_headline}\n${event.synthesized_summary}`
        const embedding = await generateEmbedding(textToEmbed)
        const eventDate = event.event_date ? new Date(event.event_date) : new Date()
        pineconeVectors.push({
          id: `event_${event._id.toString()}`,
          values: embedding,
          metadata: {
            type: 'event',
            headline: event.synthesized_headline,
            summary: event.synthesized_summary,
            country: Array.isArray(event.country)
              ? event.country.join(', ')
              : event.country, // Handle array
            event_date: eventDate.toISOString(),
            key_individuals: (event.key_individuals || []).map((p) => p.name).join(', '),
          },
        })
      }
    }

    // ACTION: This block will now often be skipped, which is correct.
    if (articlesToSave && articlesToSave.length > 0) {
      const articleOps = []
      const eventKeyToIdMap = new Map(savedEvents.map((e) => [e.event_key, e._id]))
      const articleIdToEventKeyMap = new Map()
      for (const event of eventsToSave) {
        for (const sourceArticle of event.source_articles) {
          const article = articlesToSave.find((a) => a.link === sourceArticle.link)
          if (article) articleIdToEventKeyMap.set(article._id.toString(), event.event_key)
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
        if (eventKey) article.synthesizedEventId = eventKeyToIdMap.get(eventKey)

        const { _id, ...dataToSet } = article
        delete dataToSet.articleContent
        Object.keys(dataToSet).forEach(
          (key) => dataToSet[key] === undefined && delete dataToSet[key]
        )
        delete dataToSet.embedding
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

    const opportunityDocs =
      (await Opportunity.find({
        _id: { $in: (savedOpportunities || []).map((o) => o._id) },
      }).lean()) || []
    for (const opp of opportunityDocs) {
      if (opp.embedding && opp.embedding.length > 0) {
        pineconeVectors.push({
          id: `opportunity_${opp._id.toString()}`,
          values: opp.embedding,
          metadata: {
            type: 'opportunity',
            headline: opp.reachOutTo,
            summary: opp.whyContact.join(' '),
            country: Array.isArray(opp.basedIn) ? opp.basedIn.join(', ') : opp.basedIn,
          },
        })
      }
    }
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

// ... (filterFreshArticles function remains unchanged) ...
export async function filterFreshArticles(articles, isRefreshMode = false) {
  if (!articles || articles.length === 0) return []
  const scrapedLinks = articles.map((a) => a.link)
  if (isRefreshMode) {
    logger.warn('REFRESH MODE: All scraped articles will be processed.')
    const result = await findArticlesByLinks(scrapedLinks)
    if (!result.success) throw new Error(result.error)
    const existingArticlesMap = new Map(result.data.map((a) => [a.link, a._id]))
    const articlesForReprocessing = articles.map((scrapedArticle) =>
      existingArticlesMap.get(scrapedArticle.link)
        ? { ...scrapedArticle, _id: existingArticlesMap.get(scrapedArticle.link) }
        : scrapedArticle
    )
    return articlesForReprocessing
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
