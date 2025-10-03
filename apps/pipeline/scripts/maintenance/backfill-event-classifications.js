// apps/pipeline/scripts/maintenance/backfill-event-classifications.js
import { initializeScriptEnv } from '../seed/lib/script-init.js'
import { logger, sendErrorAlert } from '@headlines/utils-server'
import { findEvents, updateEvents } from '@headlines/data-access'
import { callLanguageModel } from '@headlines/ai-services'
import colors from 'ansi-colors'
import cliProgress from 'cli-progress'
import pLimit from 'p-limit'

const CONCURRENCY_LIMIT = 5

const getClassificationPrompt =
  () => `You are a sharp, succinct financial analyst. Your sole task is to classify a synthesized news event into one of the predefined categories based on its headline and summary.

**Categories & Definitions:**
- **"New Wealth"**: A direct, confirmed liquidity event (e.g., company sale, M&A, exit).
- **"Future Wealth"**: A high-probability future liquidity event (e.g., confirmed IPO plans, seeking a buyer).
- **"Wealth Mentioned"**: A profile of existing significant wealth (e.g., "Rich List" feature, an article detailing a family's large fortune).
- **"Legal/Dispute"**: A significant legal or financial dispute involving a high-net-worth entity.
- **"Background"**: Important contextual information (e.g., philanthropic donation, succession changes, major personal investments).
- **"Other"**: Any relevant event that does not fit the above categories.

You will be given the event's headline and summary. You MUST respond ONLY with a valid JSON object with a single key "classification".

Example Input:
"Headline: EQT acquires Swedish AI firm Sana for $1.1 billion
Summary: The acquisition delivers a major liquidity event to the founders of Sana..."

Example JSON Response:
{ "classification": "New Wealth" }`

async function main() {
  const startTime = Date.now()
  try {
    await initializeScriptEnv()
    logger.info('🚀 Starting backfill of `eventClassification` for past events...')

    const eventsResult = await findEvents({
      filter: { eventClassification: { $exists: false } },
      select: '_id synthesized_headline synthesized_summary',
    })

    if (!eventsResult.success) throw new Error(eventsResult.error)
    const eventsToUpdate = eventsResult.data

    if (eventsToUpdate.length === 0) {
      logger.info(
        '✅ No events found that need classification. All items are up to date.'
      )
      return
    }

    logger.info(
      `Found ${eventsToUpdate.length} events to classify. Processing in parallel (limit: ${CONCURRENCY_LIMIT})...`
    )
    const progressBar = new cliProgress.SingleBar({
      format: `Classifying | ${colors.cyan('{bar}')} | {percentage}% || {value}/{total} Events`,
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true,
    })
    progressBar.start(eventsToUpdate.length, 0)

    const limit = pLimit(CONCURRENCY_LIMIT)
    const updatePromises = []

    const processingPromises = eventsToUpdate.map((event) =>
      limit(async () => {
        try {
          const userContent = `Headline: ${event.synthesized_headline}\nSummary: ${event.synthesized_summary}`
          const result = await callLanguageModel({
            modelName: process.env.LLM_MODEL_UTILITY || 'gpt-5-nano',
            systemPrompt: getClassificationPrompt(),
            userContent,
            isJson: true,
          })

          if (result && !result.error && result.classification) {
            updatePromises.push(
              updateEvents(
                { _id: event._id },
                { $set: { eventClassification: result.classification } }
              )
            )
            logger.trace(
              `Classification for "${event.synthesized_headline.substring(0, 50)}...": ${result.classification}`
            )
          } else {
            logger.warn(`Failed to get a valid classification for event ID ${event._id}.`)
          }
        } catch (error) {
          logger.error({ err: error }, `Error processing event ID ${event._id}`)
        } finally {
          progressBar.increment()
        }
      })
    )

    await Promise.all(processingPromises)
    await Promise.all(updatePromises)
    progressBar.stop()

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    logger.info(
      colors.green(
        `✅ Backfill complete in ${duration}s. Updated ${updatePromises.length} events.`
      )
    )
  } catch (error) {
    sendErrorAlert(error, { origin: 'BACKFILL_EVENT_CLASSIFICATIONS_SCRIPT' })
    logger.fatal({ err: error }, 'A critical error occurred during the backfill process.')
  }
}

main()
