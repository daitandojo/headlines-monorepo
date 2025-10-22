// apps/pipeline/scripts/test-pipeline/test-save-logic.js
/**
 * @command test:save-logic
 * @group Test
 * @description Injects a perfect, in-memory event and opportunity directly into the final commit stage to surgically test the save logic.
 * @example pnpm run test:save-logic
 * @example pnpm run test:save-logic -- --dry-run
 */
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { initializeScriptEnv } from '../seed/lib/script-init.js'
import { logger } from '@headlines/utils-shared'
import { RunStatsManager } from '../../src/utils/runStatsManager.js'
import { ArticleTraceLogger } from '../../src/utils/articleTraceLogger.js'
import { runCommitAndNotify } from '../../src/pipeline/5_commitAndNotify.js'
import colors from 'ansi-colors'
import mongoose from 'mongoose'

function createMockPayload() {
  const eventId = new mongoose.Types.ObjectId()
  const articleId = new mongoose.Types.ObjectId()

  const mockArticle = {
    _id: articleId,
    headline: 'French shipping family sells NaviSoft SaaS package for $500mm',
    link: 'https://test.headlines.dev/test-article',
    newspaper: 'Test Source',
    assessment_article:
      'The sale of NaviSoft by the Møller-Jensen family to Global Tech Partners for $500M is a major liquidity event. The primary beneficiaries are the family, particularly founder Lars Møller-Jensen and his daughter, CEO Eva Møller-Jensen.',
    relevance_article: 100,
    key_individuals: [
      { name: 'Eva Møller-Jensen', role_in_event: 'CEO & Seller' },
      { name: 'Lars Møller-Jensen', role_in_event: 'Founder & Patriarch' },
    ],
  }

  // --- START OF DEFINITIVE FIX ---
  // The event country is now set to 'France' as requested for testing.
  const mockEvent = {
    _id: eventId,
    event_key: `test-save-logic-${new Date().getTime()}`,
    synthesized_headline:
      'TEST EVENT: Møller-Jensen Family Finalizes Sale of Maritime Software Firm NaviSoft',
    synthesized_summary:
      'This is a test event to verify the database commit logic, ensuring it passes the Judge agent.',
    highest_relevance_score: 100,
    country: ['France'],
    key_individuals: [{ name: 'Eva Møller-Jensen', role_in_event: 'CEO & Seller' }],
    source_articles: [
      {
        _id: articleId,
        headline: mockArticle.headline,
        link: mockArticle.link,
        newspaper: mockArticle.newspaper,
      },
    ],
    ai_assessment_reason: mockArticle.assessment_article,
    toObject: () => mockEvent,
  }

  const mockOpportunity = {
    reachOutTo: 'Eva Møller-Jensen',
    contactDetails: { role: 'CEO & Seller', company: 'NaviSoft' },
    lastKnownEventLiquidityMM: 500,
    whyContact: [
      'Generated from test-save-logic script to verify end-to-end save process.',
    ],
    event_key: mockEvent.event_key,
  }

  return { mockEvent, mockOpportunity, mockArticle }
}
// --- END OF DEFINITIVE FIX ---

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
      '\n🧪 Surgically Testing Stage 5 (Commit & Notify) with High-Fidelity In-Memory Data 🧪\n'
    )
  )

  const { mockEvent, mockOpportunity, mockArticle } = createMockPayload()
  logger.info(
    'Injecting 1 high-fidelity synthetic event and 1 synthetic opportunity directly into Stage 5.'
  )

  const runStatsManager = new RunStatsManager()
  const articleTraceLogger = new ArticleTraceLogger()
  await articleTraceLogger.initialize()

  let pipelinePayload = {
    synthesizedEvents: [mockEvent],
    opportunitiesToSave: [mockOpportunity],
    enrichedArticles: [mockArticle],
    runStatsManager,
    articleTraceLogger,
    isDryRun: argv.dryRun,
    noCommitMode: argv.dryRun,
    dbConnection: true,
    lean: true,
    skipdeepdive: true,
    test: true,
  }

  try {
    pipelinePayload = (await runCommitAndNotify(pipelinePayload)).payload

    if (pipelinePayload.savedEvents?.length > 0) {
      logger.info(
        colors.green.bold(
          `\n✅ SUCCESS! Stage 5 completed and reported saving ${pipelinePayload.savedEvents.length} event(s).`
        )
      )
      logger.info(
        'Please verify the "synthesized_events" and "opportunities" collections in your database.'
      )
    } else {
      logger.error(
        colors.red.bold(
          '\n❌ FAILURE! Stage 5 completed but reported 0 saved events. The Judge likely discarded the event. Check logs for verdict.'
        )
      )
    }

    console.log('\n--- Final Run Stats ---')
    console.dir(runStatsManager.getStats(), { depth: 2 })
    console.log('---------------------\n')
  } catch (error) {
    logger.fatal({ err: error }, 'A critical error occurred while testing Stage 5.')
  }
}

main()
