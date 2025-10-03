// apps/pipeline/scripts/maintenance/backfill-suggestion-terms.js
import { initializeScriptEnv } from '../seed/lib/script-init.js'
import { logger } from '@headlines/utils-shared'
import {
  findWatchlistSuggestions,
  updateWatchlistSuggestion,
} from '@headlines/data-access'
import { callLanguageModel } from '@headlines/ai-services'
import colors from 'ansi-colors'
import cliProgress from 'cli-progress'
import pLimit from 'p-limit'

const CONCURRENCY_LIMIT = 5

const getSearchTermPrompt = () => `
You are a search query generation expert for a financial intelligence firm. Your task is to analyze an entity's name, type, and context to generate a list of likely search terms (or "crums") that would identify this entity in news headlines.
**CRITICAL Instructions:**
1.  Analyze the Input: You will receive the entity's formal name, its type (person, family, company), and a brief rationale.
2.  Generate Aliases and Keywords: Think of common abbreviations, alternative spellings, key individuals, or related company names.
3.  Return a List: Your output MUST be an array of 2-4 lowercase strings.
4.  Simplicity is Key: The terms should be simple and likely to appear in text. Good examples: 'haugland', 'syversen', 'nordic capital'. Bad examples: 'the', 'capital', 'family'.
5.  Your response MUST be a valid JSON object with the following structure: { "searchTerms": ["term1", "term2"] }
`

async function main() {
  await initializeScriptEnv()
  logger.info('🚀 Starting one-off backfill of search terms for watchlist suggestions...')

  try {
    const suggestionsResult = await findWatchlistSuggestions({
      filter: {
        status: 'candidate',
        $or: [{ searchTerms: { $exists: false } }, { searchTerms: { $size: 0 } }],
      },
    })

    if (!suggestionsResult.success) throw new Error(suggestionsResult.error)
    const suggestionsToUpdate = suggestionsResult.data

    if (suggestionsToUpdate.length === 0) {
      logger.info(
        '✅ No suggestions found that need backfilling. All items are up to date.'
      )
      return
    }

    logger.info(
      `Found ${suggestionsToUpdate.length} suggestions to update. Processing in parallel...`
    )
    const progressBar = new cliProgress.SingleBar({
      format: `Backfilling | ${colors.cyan('{bar}')} | {percentage}% || {value}/{total} Suggestions`,
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true,
    })
    progressBar.start(suggestionsToUpdate.length, 0)

    const limit = pLimit(CONCURRENCY_LIMIT)
    let updatedCount = 0

    const processingPromises = suggestionsToUpdate.map((suggestion) =>
      limit(async () => {
        try {
          const userContent = `Entity Name: ${suggestion.name}\nEntity Type: ${suggestion.type}\nRationale: ${suggestion.rationale}`
          const result = await callLanguageModel({
            modelName: process.env.LLM_MODEL_UTILITY || 'gpt-5-nano',
            systemPrompt: getSearchTermPrompt(),
            userContent,
            isJson: true,
          })

          if (result && !result.error && result.searchTerms) {
            const updateResult = await updateWatchlistSuggestion(suggestion._id, {
              searchTerms: result.searchTerms,
            })
            if (updateResult.success) updatedCount++
            logger.trace(
              `Generated terms for "${suggestion.name}": ${result.searchTerms.join(', ')}`
            )
          } else {
            logger.warn(`Failed to generate terms for "${suggestion.name}".`)
          }
        } catch (error) {
          logger.error({ err: error }, `Error processing suggestion ${suggestion.name}`)
        } finally {
          progressBar.increment()
        }
      })
    )

    await Promise.all(processingPromises)
    progressBar.stop()

    logger.info(
      colors.green(
        `✅ Backfill complete. Successfully updated ${updatedCount} suggestions.`
      )
    )
  } catch (error) {
    logger.error({ err: error }, 'A critical error occurred during the backfill process.')
  }
}

main()
