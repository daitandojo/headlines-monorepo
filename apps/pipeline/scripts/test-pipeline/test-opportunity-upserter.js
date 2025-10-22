// apps/pipeline/scripts/test-pipeline/test-opportunity-upserter.js
/**
 * @command test:upserter
 * @group Test
 * @description A fast, targeted test for the opportunityUpserter module.
 */
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { initializeScriptEnv } from '../seed/lib/script-init.js'
import { logger } from '@headlines/utils-shared'
import { SynthesizedEvent, Opportunity } from '@headlines/models'
import { enrichAndLinkOpportunities } from '../../src/pipeline/submodules/opportunityUpserter.js'
import colors from 'ansi-colors'

async function main() {
  const argv = yargs(hideBin(process.argv))
    .option('dry-run', {
      type: 'boolean',
      description: 'Simulate the run without writing to the database.',
    })
    .help().argv

  await initializeScriptEnv()
  logger.info(
    colors.bold.cyan(
      '\n🧪 Starting Targeted Test for opportunityUpserter.js (MOCKED AI) 🧪\n'
    )
  )

  try {
    // 1. Get ONE real, high-quality event from the DB to use as input
    logger.info(
      'Step 1: Fetching 1 high-quality event from the database to use as test input...'
    )
    const realSavedEvents = await SynthesizedEvent.find({
      key_individuals: { $exists: true, $not: { $size: 0 } },
    })
      .sort({ createdAt: -1 })
      .limit(1) // Only fetch one to keep it fast
      .lean()

    if (realSavedEvents.length === 0) {
      logger.error(
        'Could not find any suitable events in the database to test with. Please run the pipeline first.'
      )
      return
    }
    logger.info(`  -> Found ${realSavedEvents.length} event.`)
    console.table(
      realSavedEvents.map((e) => ({
        Headline: e.synthesized_headline,
        Individuals: e.key_individuals.map((i) => i.name).join(', '),
      }))
    )

    // 2. Simulate the `potentialOpportunities` that would have been generated earlier.
    logger.info('Step 2: Simulating potential opportunities payload...')
    const potentialOpportunities = realSavedEvents.flatMap((event) =>
      (event.key_individuals || []).map((individual) => ({
        reachOutTo: individual.name,
        contactDetails: { role: individual.role_in_event, company: individual.company },
        lastKnownEventLiquidityMM:
          event.transactionDetails?.liquidityFlow?.approxAmountUSD || 0,
        whyContact: [
          'Generated from test script for event: ' + event.synthesized_headline,
        ],
        event_key: event.event_key,
      }))
    )
    logger.info(
      `  -> Created ${potentialOpportunities.length} mock opportunities to process.`
    )

    if (argv.dryRun) {
      logger.warn(
        '\nDRY RUN MODE: Skipping database writes. The test will simulate the logic but not commit any changes.'
      )
    }

    // 3. Execute the target function
    logger.info(colors.bold.yellow(`\nStep 3: Executing enrichAndLinkOpportunities()...`))
    const savedOpportunities = await enrichAndLinkOpportunities(
      potentialOpportunities,
      realSavedEvents
    )

    // 4. Verification
    logger.info(colors.bold.cyan(`\n--- VERIFICATION ---`))
    if (savedOpportunities.length > 0) {
      logger.info(
        colors.green(
          `✅ SUCCESS: The function returned ${savedOpportunities.length} opportunity documents.`
        )
      )
      console.table(
        savedOpportunities.map((opp) => ({
          Name: opp.reachOutTo,
          'Linked Events': (opp.events || []).length,
          'Est. Wealth':
            opp.lastKnownEventLiquidityMM || opp.profile?.estimatedNetWorthMM || 'N/A',
        }))
      )
      logger.info(
        'Verification complete. Check the table above for the final linked data.'
      )
    } else {
      logger.error(
        '❌ FAILURE: The function returned 0 opportunities. This indicates the process failed internally.'
      )
    }
  } catch (error) {
    logger.fatal({ err: error }, 'A critical error occurred during the test script.')
  }
}

main()
