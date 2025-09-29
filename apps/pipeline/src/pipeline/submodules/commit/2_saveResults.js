// apps/pipeline/src/pipeline/submodules/commit/2_saveResults.js (version 2.1.1)
import mongoose from 'mongoose'
import { savePipelineResults } from '../../../modules/dataStore/index.js'
import { enrichAndLinkOpportunities } from '../opportunityUpserter.js'
import { logger } from '@headlines/utils-server'

export async function saveResultsToDb(
  pipelinePayload,
  finalEventsToSave,
  finalOpportunitiesToSave
) {
  const { assessedCandidates, isDryRun, runStats } = pipelinePayload

  // --- START LOGIC FIX ---
  // The articles to be saved are no longer just 'assessedCandidates'.
  // We need to find the specific articles that were successfully processed
  // into the final, approved events.
  const finalEventArticleLinks = new Set(
    finalEventsToSave.flatMap((event) => event.source_articles.map((a) => a.link))
  )
  const articlesToSave = (pipelinePayload.enrichedArticles || []).filter((article) =>
    finalEventArticleLinks.has(article.link)
  )
  // --- END LOGIC FIX ---

  if (isDryRun) {
    logger.warn('DRY RUN: Simulating database save.')
    const savedEvents = finalEventsToSave.map((event) => ({
      ...event,
      _id: new mongoose.Types.ObjectId(),
    }))
    return {
      savedEvents,
      savedOpportunities: finalOpportunitiesToSave,
      articlesSavedCount: articlesToSave.length,
    }
  }

  const commitResult = await savePipelineResults(articlesToSave, finalEventsToSave)

  if (commitResult.success) {
    const savedEvents = commitResult.savedEvents
    try {
      const savedOpportunities = await enrichAndLinkOpportunities(
        finalOpportunitiesToSave,
        savedEvents
      )
      // The `savePipelineResults` and `enrichAndLinkOpportunities` functions
      // already return lean objects, so no need for JSON stringify/parse.
      return {
        savedEvents,
        savedOpportunities,
        articlesSavedCount: articlesToSave.length,
      }
    } catch (error) {
      logger.error(
        { err: error },
        'CRITICAL: Failed during opportunity enrichment and linking. Opportunities will not be saved or sent.'
      )
      runStats.errors.push('CRITICAL: Opportunity processing failed: ' + error.message)
      return {
        savedEvents,
        savedOpportunities: [],
        articlesSavedCount: articlesToSave.length,
      }
    }
  } else {
    runStats.errors.push('CRITICAL: Failed to commit pipeline results.')
    return { savedEvents: [], savedOpportunities: [], articlesSavedCount: 0 }
  }
}
