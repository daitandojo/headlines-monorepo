// apps/pipeline/scripts/maintenance/recover-opportunities.js
/**
 * @command maintenance:recover-opps
 * @group Maintenance
 * @description Finds events with key individuals but no linked opportunities and re-runs the opportunity creation process.
 * @example pnpm run maintenance:recover-opps -- --yes
 * @example pnpm run maintenance:recover-opps -- --dry-run --since-hours 72
 */
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import colors from 'ansi-colors'
import { initializeScriptEnv } from '../seed/lib/script-init.js'
import { logger } from '@headlines/utils-shared'
import { SynthesizedEvent } from '@headlines/models'
import { enrichAndLinkOpportunities } from '../../src/pipeline/submodules/opportunityUpserter.js'
import { closeReader, promptUser } from '../seed/lib/user-interact.js'

async function main() {
  const argv = yargs(hideBin(process.argv))
    .option('dry-run', {
      type: 'boolean',
      description: 'Simulate the run without writing to the database.',
    })
    .option('yes', {
      alias: 'y',
      type: 'boolean',
      description: 'Skip the confirmation prompt.',
    })
    .option('since-hours', {
      type: 'number',
      description: 'Lookback window in hours to find orphaned events.',
      default: 48, // Default to the last 2 days
    })
    .help().argv

  await initializeScriptEnv()
  logger.info('🚀 Starting Opportunity Recovery Script...')

  try {
    const cutoffDate = new Date(Date.now() - argv.sinceHours * 60 * 60 * 1000)
    logger.info(
      `Searching for orphaned events created since ${cutoffDate.toISOString()}...`
    )

    // Find events that have key_individuals but no linked relatedOpportunities
    const orphanedEvents = await SynthesizedEvent.find({
      createdAt: { $gte: cutoffDate },
      key_individuals: { $exists: true, $not: { $size: 0 } },
      relatedOpportunities: { $exists: true, $size: 0 },
    }).lean()

    if (orphanedEvents.length === 0) {
      logger.info(
        '✅ No orphaned events found within the specified time frame. Nothing to recover.'
      )
      return
    }

    logger.info(
      colors.yellow(
        `\nFound ${orphanedEvents.length} event(s) to reprocess for opportunities:`
      )
    )
    console.table(
      orphanedEvents.map((e) => ({
        EventID: e._id,
        Headline: e.synthesized_headline.substring(0, 70) + '...',
        'Key Individuals': e.key_individuals.map((k) => k.name).join(', '),
      }))
    )

    if (argv.dryRun) {
      logger.info(
        colors.yellow(
          '\n[DRY RUN] Would attempt to generate and link opportunities for the events listed above.'
        )
      )
      logger.info('[DRY RUN] No changes will be made to the database.')
      return
    }

    if (!argv.yes) {
      const answer = await promptUser(
        '\nProceed with reprocessing these events to generate opportunities? (y/n): '
      )
      if (answer !== 'y') {
        logger.warn('Operation cancelled by user.')
        return
      }
    }

    logger.info(`\n⚙️ Reprocessing ${orphanedEvents.length} event(s)...`)

    // We can reuse the existing `enrichAndLinkOpportunities` function.
    // We pass an empty array for `potentialOpportunities` because we are starting fresh
    // from the `key_individuals` within the `savedEvents` (our orphanedEvents).
    const recoveredOpportunities = await enrichAndLinkOpportunities([], orphanedEvents)

    if (recoveredOpportunities.length > 0) {
      logger.info(
        colors.green(
          `\n✅ Success! Recovered and saved ${recoveredOpportunities.length} opportunities.`
        )
      )
    } else {
      logger.warn(
        '\n⚠️ Reprocessing complete, but no new opportunities were created. This may be expected if they were duplicates or failed generation again.'
      )
    }
  } catch (error) {
    logger.fatal({ err: error }, 'A critical error occurred during the recovery script.')
  }
}

main().finally(() => closeReader())
