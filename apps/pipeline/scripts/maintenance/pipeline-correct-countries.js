// apps/pipeline/scripts/maintenance/pipeline-correct-countries.js
import { initializeScriptEnv } from '../seed/lib/script-init.js'
import { logger } from '@headlines/utils-shared'
import { getDistinctOpportunityFields, updateOpportunities } from '@headlines/data-access'
import { countryCorrectionChain } from '@headlines/ai-services'
import colors from 'ansi-colors'
import cliProgress from 'cli-progress'

async function main() {
  await initializeScriptEnv()
  logger.info('🚀 Starting Retrospective Country Data Cleanup (Efficient Mode)...')

  try {
    const distinctResult = await getDistinctOpportunityFields('basedIn')
    if (!distinctResult.success) throw new Error(distinctResult.error)
    const allBasedInValues = distinctResult.data

    if (allBasedInValues.length === 0) {
      logger.info('✅ No opportunities with country data found to scan.')
      return
    }

    const invalidValues = allBasedInValues.filter(
      (v) =>
        v &&
        (v.includes('(') || v.includes('/') || v.length > 30 || !/^[a-zA-Z\s]+$/.test(v))
    )

    if (invalidValues.length === 0) {
      logger.info('✅ No invalid-looking country names found. Data appears clean.')
      return
    }

    logger.info(
      `Found ${invalidValues.length} unique potentially invalid 'basedIn' values to correct...`
    )

    const progressBar = new cliProgress.SingleBar({
      format: `Correcting | ${colors.cyan('{bar}')} | {percentage}% || {value}/{total} Unique Locations`,
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true,
    })
    progressBar.start(invalidValues.length, 0)

    let totalModifiedCount = 0
    for (const originalCountry of invalidValues) {
      const result = await countryCorrectionChain({ location_string: originalCountry })

      if (
        result &&
        !result.error &&
        result.country &&
        result.country !== originalCountry
      ) {
        logger.info(`Correction found: "${originalCountry}" -> "${result.country}"`)
        const updateResult = await updateOpportunities(
          { basedIn: originalCountry },
          { $set: { basedIn: result.country } }
        )
        if (updateResult.success) totalModifiedCount += updateResult.modifiedCount
      }
      progressBar.increment()
    }
    progressBar.stop()

    if (totalModifiedCount > 0) {
      logger.info(
        colors.green(
          `✅ Cleanup complete. Modified ${totalModifiedCount} opportunity documents.`
        )
      )
    } else {
      logger.info('✅ No country corrections were needed.')
    }
  } catch (error) {
    logger.error({ err: error }, 'An error occurred during the country cleanup process.')
  }
}

main()
