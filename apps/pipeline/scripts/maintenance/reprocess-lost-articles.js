// apps/pipeline/scripts/maintenance/reprocess-lost-articles.js
import { initializeScriptEnv } from '../seed/lib/script-init.js'
import { logger } from '@headlines/utils-shared'
import { findArticles } from '@headlines/data-access'
import { runAssessAndEnrich } from '../../src/pipeline/3_assessAndEnrich.js'
import { runClusterAndSynthesize } from '../../src/pipeline/4_clusterAndSynthesize.js'
import { runCommitAndNotify } from '../../src/pipeline/5_commitAndNotify.js'
import colors from 'ansi-colors'

async function main() {
  await initializeScriptEnv()
  logger.info('🚀 Starting reprocessing script for lost articles...')

  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const articlesResult = await findArticles({
      filter: {
        status: 'scraped',
        synthesizedEventId: { $exists: false },
        createdAt: { $gte: twentyFourHoursAgo },
      },
    })

    if (!articlesResult.success) throw new Error(articlesResult.error)
    const articlesToReprocess = articlesResult.data

    if (articlesToReprocess.length === 0) {
      logger.info('✅ No articles found needing reprocessing.')
      return
    }

    logger.info(
      colors.yellow(`Found ${articlesToReprocess.length} articles to reprocess.`)
    )

    let pipelinePayload = {
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

    logger.info('--- REPROCESSING STAGE 3: ASSESS & ENRICH ---')
    pipelinePayload = (await runAssessAndEnrich(pipelinePayload)).payload

    if (pipelinePayload.enrichedArticles && pipelinePayload.enrichedArticles.length > 0) {
      logger.info('--- REPROCESSING STAGE 4: CLUSTER & SYNTHESIZE ---')
      pipelinePayload = (await runClusterAndSynthesize(pipelinePayload)).payload
    } else {
      logger.info('No articles survived the enrichment stage. Halting.')
    }

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
  }
}

main()
