// apps/pipeline/src/pipeline/submodules/commit/2_saveResults.js (version 2.1.1)
import mongoose from 'mongoose'
import { savePipelineResults } from '../../../modules/dataStore/index.js'
import { enrichAndLinkOpportunities } from '../opportunityUpserter.js'
import { logger } from '@headlines/utils/src/logger.js'

export async function saveResultsToDb(
  pipelinePayload,
  finalEventsToSave,
  finalOpportunitiesToSave
) {
  const { assessedCandidates, isDryRun, runStats } = pipelinePayload
  const articlesToSave = assessedCandidates || []

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
      // DEFINITIVE FIX: Ensure the returned objects are plain JS objects (.lean())
      // The `savePipelineResults` already returns lean objects, so this is a confirmation of that contract.
      return {
        savedEvents: JSON.parse(JSON.stringify(savedEvents)),
        savedOpportunities: JSON.parse(JSON.stringify(savedOpportunities)),
        articlesSavedCount: articlesToSave.length,
      }
    } catch (error) {
      logger.error(
        { err: error },
        'CRITICAL: Failed during opportunity enrichment and linking. Opportunities will not be saved or sent.'
      )
      runStats.errors.push('CRITICAL: Opportunity processing failed: ' + error.message)
      return {
        savedEvents: JSON.parse(JSON.stringify(savedEvents)),
        savedOpportunities: [],
        articlesSavedCount: articlesToSave.length,
      }
    }
  } else {
    runStats.errors.push('CRITICAL: Failed to commit pipeline results.')
    return { savedEvents: [], savedOpportunities: [], articlesSavedCount: 0 }
  }
}
