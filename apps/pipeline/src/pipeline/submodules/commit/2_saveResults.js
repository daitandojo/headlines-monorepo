// apps/pipeline/src/pipeline/submodules/commit/2_saveResults.js (CORRECTED - Article saving removed)
import mongoose from 'mongoose'
import { savePipelineResults } from '../../../modules/dataStore/index.js'
import { enrichAndLinkOpportunities } from '../opportunityUpserter.js'
import { logger } from '@headlines/utils-shared'

export async function saveResultsToDb(
  pipelinePayload,
  finalEventsToSave,
  finalOpportunitiesToSave
) {
  const { isDryRun, runStats } = pipelinePayload

  // The logic for determining articlesToSave has been removed.
  // The articles have already been saved in Stage 3.

  if (isDryRun) {
    logger.warn('DRY RUN: Simulating database save.')
    const savedEvents = finalEventsToSave.map((event) => ({
      ...event,
      _id: new mongoose.Types.ObjectId(),
    }))
    return {
      savedEvents,
      savedOpportunities: finalOpportunitiesToSave,
      articlesSavedCount: 0, // This is no longer this stage's responsibility
    }
  }

  // ACTION: Call savePipelineResults with an empty array for articles.
  const commitResult = await savePipelineResults([], finalEventsToSave)

  if (commitResult.success) {
    const savedEvents = commitResult.savedEvents
    try {
      const savedOpportunities = await enrichAndLinkOpportunities(
        finalOpportunitiesToSave,
        savedEvents
      )
      return {
        savedEvents,
        savedOpportunities,
        articlesSavedCount: 0, // No longer this stage's responsibility
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
        articlesSavedCount: 0,
      }
    }
  } else {
    runStats.errors.push('CRITICAL: Failed to commit pipeline results.')
    return { savedEvents: [], savedOpportunities: [], articlesSavedCount: 0 }
  }
}
