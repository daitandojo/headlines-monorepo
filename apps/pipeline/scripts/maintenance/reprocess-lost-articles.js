// apps/pipeline/scripts/maintenance/reprocess-lost-articles.js
'use server'

import mongoose from 'mongoose'
import { Article } from '../../../../packages/models/src/index.js'
import { initializeScriptEnv } from '../seed/lib/script-init.js'
import { logger } from '@headlines/utils-server'
import { runAssessAndEnrich } from '../../src/pipeline/3_assessAndEnrich.js'
import { runClusterAndSynthesize } from '../../src/pipeline/4_clusterAndSynthesize.js'
import { runCommitAndNotify } from '../../src/pipeline/5_commitAndNotify.js'
import colors from 'ansi-colors'

async function main() {
  await initializeScriptEnv()
  logger.info('🚀 Starting reprocessing script for lost articles...')

  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

    // DEFINITIVE QUERY: Look for articles that were just scraped but never processed further.
    // The key indicators are `status: 'scraped'` and the absence of a `synthesizedEventId`.
    const articlesToReprocess = await Article.find({
      status: 'scraped', // This is the state they are in after Stage 2
      synthesizedEventId: { $exists: false },
      createdAt: { $gte: twentyFourHoursAgo },
    }).lean()

    if (articlesToReprocess.length === 0) {
      logger.info('✅ No articles found needing reprocessing.')
      return
    }

    logger.info(
      colors.yellow(`Found ${articlesToReprocess.length} articles to reprocess.`)
    )

    // Create a pipelinePayload to feed into the subsequent stages
    let pipelinePayload = {
      // Start the process with 'articlesForPipeline' so Stage 3 picks them up
      articlesForPipeline: articlesToReprocess,
      runStats: {
        errors: [],
        eventsSynthesized: 0,
        judgeVerdict: null,
        eventsEmailed: 0,
        enrichmentOutcomes: [],
        scraperHealth: [],
      },
      dbConnection: true,
      noCommitMode: false,
    }

    // Run Stage 3: Assess & Enrich
    logger.info('--- REPROCESSING STAGE 3: ASSESS & ENRICH ---')
    pipelinePayload = (await runAssessAndEnrich(pipelinePayload)).payload

    // Run Stage 4: Cluster & Synthesize
    if (pipelinePayload.enrichedArticles && pipelinePayload.enrichedArticles.length > 0) {
      logger.info('--- REPROCESSING STAGE 4: CLUSTER & SYNTHESIZE ---')
      pipelinePayload = (await runClusterAndSynthesize(pipelinePayload)).payload
    } else {
      logger.info('No articles survived the enrichment stage. Halting.')
    }

    // Run Stage 5: Commit & Notify
    if (
      pipelinePayload.synthesizedEvents &&
      pipelinePayload.synthesizedEvents.length > 0
    ) {
      logger.info('--- REPROCESSING STAGE 5: COMMIT & NOTIFY ---')
      pipelinePayload = (await runCommitAndNotify(pipelinePayload)).payload
    } else {
      logger.info('No events were synthesized from the reprocessed articles.')
    }

    logger.info(colors.green('✅ Reprocessing complete!'))
    logger.info(`  - Events created: ${pipelinePayload.runStats.eventsSynthesized}`)
    logger.info(`  - Notifications sent: ${pipelinePayload.runStats.eventsEmailed}`)
  } catch (error) {
    logger.error({ err: error }, 'A critical error occurred during reprocessing.')
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect()
    }
  }
}

main()
