// apps/pipeline/scripts/seed/ingest-richlist.js
import { initializeScriptEnv } from './lib/script-init.js'
import { logger, sendErrorAlert } from '@headlines/utils-server'
import { loadAndPrepareRichlist } from './lib/richlist-data-loader.js'
import { createSyntheticArticle } from './lib/synthetic-article-builder.js'
import { runInjectedPipeline } from './lib/pipeline-injector.js'
import { enrichThinProfile } from './lib/enrich-thin-profile.js'
import { chunkHistoryIntoEvents } from './lib/event-chunker.js'
import colors from 'ansi-colors'

async function main() {
  try {
    await initializeScriptEnv()
    logger.info('🚀 Starting Rich List Ingestion Script (Sequential, Verbose Mode)...')

    const { allIndividuals, rawIndividualData } = await loadAndPrepareRichlist()

    logger.info(
      `Preparing to process ${allIndividuals.length} individuals from the ${allIndividuals[0]?.year || 'latest'} rich list...`
    )

    let totalEventsCreated = 0
    let totalOppsCreated = 0

    for (const person of allIndividuals) {
      logger.info(colors.cyan(`\n--- Analyzing: ${person.name} ---`))

      if (person.isThinProfile) {
        logger.info(
          colors.magenta(
            `  📝 Thin profile detected for ${person.name.toUpperCase()}. Triggering AI enrichment...`
          )
        )
        logger.info(
          { raw_data: rawIndividualData.find((p) => p.name === person.name) },
          `Raw JSON data for ${person.name}`
        )
        const enrichedData = await enrichThinProfile(person)
        person.background = enrichedData.generated_background
      }

      const eventChunks = await chunkHistoryIntoEvents(person)

      for (const [index, chunk] of eventChunks.entries()) {
        logger.info(
          colors.bold(
            `  └── Processing event chunk ${index + 1}/${eventChunks.length}: "${chunk.description}"`
          )
        )
        try {
          const syntheticArticle = createSyntheticArticle(person, chunk)
          const { savedEvents, savedOpportunities } =
            await runInjectedPipeline(syntheticArticle)

          if (savedEvents && savedEvents.length > 0) {
            totalEventsCreated += savedEvents.length
            savedEvents.forEach((event) => {
              logger.info(
                colors.green(`    ✅ Event Created: "${event.synthesized_headline}"`)
              )
            })
          }
          if (savedOpportunities && savedOpportunities.length > 0) {
            totalOppsCreated += savedOpportunities.length
            savedOpportunities.forEach((opp) => {
              logger.info(
                colors.green(
                  `    ✅ Opportunity Created: "${opp.reachOutTo}" (~$${opp.likelyMMDollarWealth}M)`
                )
              )
            })
          }
        } catch (error) {
          logger.error(
            { err: error },
            `    ❌ Failed to process event chunk: "${chunk.description}"`
          )
        }
      }
    }

    logger.info('\n--- Ingestion Summary ---')
    logger.info(colors.green(`✅ Successfully created ${totalEventsCreated} events.`))
    logger.info(
      colors.green(`✅ Successfully created ${totalOppsCreated} opportunities.`)
    )
    logger.info('✅ Script finished.')
  } catch (error) {
    sendErrorAlert(error, { origin: 'INGEST_RICHLIST_SCRIPT' })
    logger.fatal(
      { err: error },
      'A critical error occurred in the main script execution.'
    )
  }
}

main()
