// scripts/sources/analyze-sources.js (version 1.0)
import 'dotenv/config'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { logger } from '@headlines/utils-shared'
import { connectDatabase, disconnectDatabase } from '../../src/database.js'
import { scrapeSiteForHeadlines } from '../../src/modules/scraper/headlineScraper.js'
import { suggestNewSelector } from '../../src/modules/ai/agents/selectorRepairAgent.js'
import Source from '../../models/Source.js'

logger.level = 'warn' // Keep console clean for this focused tool

async function main() {
  const argv = yargs(hideBin(process.argv))
    .usage('Usage: $0 --source <SourceName> [--fix]')
    .option('source', {
      alias: 's',
      type: 'string',
      description: 'The name of the source to analyze and fix.',
      demandOption: true,
    })
    .option('fix', {
      alias: 'f',
      type: 'boolean',
      description: 'Attempt to automatically verify and apply the AI-suggested fix.',
      default: false,
    }).argv

  console.log(`\n🔎 Analyzing source: "${argv.source}"...`)

  try {
    await connectDatabase()
    const source = await Source.findOne({ name: new RegExp(`^${argv.source}$`, 'i') })
    if (!source) {
      console.error(`❌ Source "${argv.source}" not found.`)
      return
    }

    console.log(`- Current headline selector: "${source.headlineSelector}"`)
    const initialScrape = await scrapeSiteForHeadlines(source)

    if (initialScrape.success && initialScrape.resultCount > 0) {
      console.log(
        `✅ This source appears to be healthy. Found ${initialScrape.resultCount} headlines.`
      )
      return
    }

    console.log(`\n⚠️ Source is failing. Reason: ${initialScrape.error}`)
    if (!initialScrape.debugHtml) {
      console.error('❌ Cannot proceed with analysis: Failed to retrieve page HTML.')
      return
    }

    console.log('🤖 Asking AI agent to suggest a new selector...')
    const suggestion = await suggestNewSelector(
      source.sectionUrl,
      source.headlineSelector,
      initialScrape.debugHtml
    )

    if (!suggestion || !suggestion.suggested_selector) {
      console.error('❌ AI agent failed to provide a suggestion.')
      return
    }

    console.log(`\n💡 AI Suggestion:`)
    console.log(`   - New Selector: "${suggestion.suggested_selector}"`)
    console.log(`   - Reasoning: "${suggestion.reasoning}"`)

    if (argv.fix) {
      console.log('\n🔧 --fix flag enabled. Verifying and applying the fix...')
      const tempSource = {
        ...source.toObject(),
        headlineSelector: suggestion.suggested_selector,
      }
      const verificationScrape = await scrapeSiteForHeadlines(tempSource)

      if (verificationScrape.success && verificationScrape.resultCount > 0) {
        console.log(
          `   - ✅ Verification successful! Found ${verificationScrape.resultCount} headlines with the new selector.`
        )
        source.headlineSelector = suggestion.suggested_selector
        await source.save()
        console.log('   - 💾 New selector has been saved to the database.')
      } else {
        console.log(
          `   - ❌ Verification failed. The suggested selector did not return any headlines.`
        )
        console.log(`   - Reason: ${verificationScrape.error}`)
      }
    } else {
      console.log(
        '\nRun with the --fix flag to automatically apply and save the new selector.'
      )
    }
  } catch (error) {
    console.error(`💥 A critical error occurred: ${error.message}`)
  } finally {
    await disconnectDatabase()
  }
}

main()
