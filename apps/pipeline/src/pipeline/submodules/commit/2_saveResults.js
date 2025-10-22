// apps/pipeline/src/pipeline/submodules/commit/2_saveResults.js
import mongoose from 'mongoose'
import {
  savePipelineResults,
  saveOpportunitiesToPinecone,
} from '../../../modules/dataStore/index.js'
import { enrichAndLinkOpportunities } from '../opportunityUpserter.js'
import { logger } from '@headlines/utils-shared'
import { findEventsByKeys } from '@headlines/data-access'

function createMockSavedEvents(events) {
  return events.map((event) => ({
    ...event,
    _id: new mongoose.Types.ObjectId(),
  }))
}

function simulateDryRunSave(approvedEvents, opportunities) {
  logger.warn('DRY RUN: Simulating database save.')
  return {
    savedEvents: createMockSavedEvents(approvedEvents),
    savedOpportunities: opportunities,
  }
}

function extractApprovedArticleLinks(events) {
  const links = events.flatMap((event) =>
    event.source_articles.map((article) => article.link)
  )
  return new Set(links)
}

function filterArticlesToSave(allArticles, approvedLinks) {
  return (allArticles || []).filter((article) => approvedLinks.has(article.link))
}

function identifyArticlesToSave(enrichedArticles, approvedEvents) {
  const approvedArticleLinks = extractApprovedArticleLinks(approvedEvents)
  return filterArticlesToSave(enrichedArticles, approvedArticleLinks)
}

async function commitEventsAndArticles(articles, events) {
  return savePipelineResults(articles, events)
}

async function processOpportunities(opportunities, savedEvents, runStatsManager) {
  try {
    logger.info(
      `[Opportunity Linking] Processing ${opportunities.length} opportunities with ${savedEvents.length} saved events`
    )
    return await enrichAndLinkOpportunities(opportunities, savedEvents)
  } catch (error) {
    logger.error(
      { err: error },
      'CRITICAL: Failed during opportunity enrichment and linking. Opportunities will not be saved or sent.'
    )
    runStatsManager.push(
      'errors',
      'CRITICAL: Opportunity processing failed: ' + error.message
    )
    return []
  }
}

function handleCommitFailure(runStatsManager) {
  runStatsManager.push('errors', 'CRITICAL: Failed to commit pipeline results.')
  return {
    savedEvents: [],
    savedOpportunities: [],
  }
}

async function handleCommitSuccess(commitResult, opportunities, runStatsManager) {
  const savedEvents = commitResult.savedEvents || []

  logger.info(
    `Commit successful: ${savedEvents.length} events returned from DB. Processing ${opportunities.length} opportunities...`
  )

  const savedOpportunities = await processOpportunities(
    opportunities,
    savedEvents,
    runStatsManager
  )

  logger.info(
    `Opportunity processing complete: ${savedOpportunities.length} opportunities saved to MongoDB`
  )

  if (savedOpportunities.length > 0) {
    const pineconeSuccess = await saveOpportunitiesToPinecone(savedOpportunities)
    if (pineconeSuccess) {
      logger.info(
        `Successfully saved ${savedOpportunities.length} opportunities to Pinecone`
      )
    } else {
      logger.warn('Failed to save some opportunities to Pinecone')
    }
  }

  return {
    savedEvents,
    savedOpportunities,
  }
}

async function executeRealSave(pipelinePayload, approvedEvents, opportunities) {
  const { runStatsManager, enrichedArticles } = pipelinePayload

  const articlesToSave = identifyArticlesToSave(enrichedArticles, approvedEvents)

  logger.info(
    `[Save] Saving ${articlesToSave.length} articles and ${approvedEvents.length} approved events to database`
  )

  const commitResult = await commitEventsAndArticles(articlesToSave, approvedEvents)

  logger.info(
    `[Save] DB Response - Success: ${commitResult.success}, Events returned: ${commitResult.savedEvents?.length || 0}`
  )

  if (commitResult.success) {
    return handleCommitSuccess(
      commitResult,
      opportunities,
      runStatsManager,
      approvedEvents
    )
  } else {
    return handleCommitFailure(runStatsManager)
  }
}

function validateInputs(allJudgedEvents, approvedEvents) {
  if (!Array.isArray(allJudgedEvents)) {
    logger.error('Invalid input: allJudgedEvents must be an array')
    return false
  }

  if (!Array.isArray(approvedEvents)) {
    logger.error('Invalid input: approvedEvents must be an array')
    return false
  }

  return true
}

function logSaveSummary(results, isDryRun) {
  const mode = isDryRun ? '[DRY RUN]' : ''
  logger.info(
    `${mode} Save Results: ${results.savedEvents.length} events, ${results.savedOpportunities.length} opportunities`
  )
}

export async function saveResultsToDb(
  pipelinePayload,
  allJudgedEvents,
  finalOpportunitiesToSave,
  approvedEvents
) {
  logger.info(
    `[saveResultsToDb] Called with: ${allJudgedEvents.length} judged events, ${approvedEvents.length} approved events, ${finalOpportunitiesToSave.length} opportunities`
  )

  if (!validateInputs(allJudgedEvents, approvedEvents)) {
    return {
      savedEvents: [],
      savedOpportunities: [],
    }
  }

  const { isDryRun } = pipelinePayload

  if (isDryRun) {
    const results = simulateDryRunSave(approvedEvents, finalOpportunitiesToSave)
    logSaveSummary(results, true)
    return results
  }

  const results = await executeRealSave(
    pipelinePayload,
    approvedEvents,
    finalOpportunitiesToSave
  )

  logSaveSummary(results, false)

  return results
}
