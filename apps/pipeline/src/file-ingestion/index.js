// apps/pipeline/src/file-ingestion/index.js
// File ingestion mode - separate entry point for rich lists, individual lists, and articles
import dbConnect from '@headlines/data-access/dbConnect/node'
import { logger } from '@headlines/utils-shared'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import path from 'path'
import { FileReader } from './FileReader.js'
import { ContentClassifier } from './ContentClassifier.js'
import { EntityExtractor } from './EntityExtractor.js'
import { DeduplicationChecker } from './DeduplicationChecker.js'
import { EnrichmentRouter } from './EnrichmentRouter.js'
import { RunLogger } from './RunLogger.js'
import { AdminNotifier } from './AdminNotifier.js'

const argv = yargs(hideBin(process.argv))
  .option('file', {
    alias: 'f',
    type: 'string',
    description: 'Path to file to ingest',
    demandOption: true,
  })
  .option('dry-run', {
    alias: 'd',
    type: 'boolean',
    description: 'Parse and classify only, no DB writes',
    default: false,
  })
  .option('verbose', {
    alias: 'v',
    type: 'boolean',
    description: 'Extra log detail to stdout',
    default: false,
  })
  .option('force', {
    alias: 'o',
    type: 'boolean',
    description: 'Skip dedup check, re-enrich all found individuals',
    default: false,
  })
  .option('limit', {
    alias: 'l',
    type: 'number',
    description: 'Limit number of individuals to enrich',
    default: null,
  })
  .help()
  .alias('help', 'h')
  .parse()

const options = {
  dryRun: argv['dry-run'],
  verbose: argv.verbose,
  force: argv.force,
  limit: argv.limit,
}

const filePath = argv.file

async function main() {
  console.log('='.repeat(60))
  console.log('FILE INGESTION MODE')
  console.log('='.repeat(60))
  console.log('File:', filePath)
  console.log('Options:', JSON.stringify(options))
  console.log('')

  // Connect to DB
  await dbConnect()
  console.log('Database connected')

  // Initialize run logger
  const runLogger = new RunLogger(filePath, options)
  const runId = runLogger.runId

  console.log('Run ID:', runId)
  console.log('')

  try {
    // Step 1: FileReader
    console.log('[1/7] Reading file...')
    const fileData = await FileReader.read(filePath)
    console.log(`  Read ${fileData.lineCount} lines, ${fileData.fileSizeBytes} bytes`)
    console.log(`  Format: ${fileData.format}, Encoding: ${fileData.detectedEncoding}`)
    runLogger.logFileRead(fileData)

    // Step 2: ContentClassifier
    console.log('[2/7] Classifying content...')
    const classification = await ContentClassifier.classify(fileData.rawContent)
    console.log(`  Classification: ${classification.classification} (${classification.confidence})`)
    console.log(`  Language: ${classification.detectedLanguage}, Records: ${classification.estimatedRecordCount}`)
    runLogger.logClassification(classification)

    // Step 3: EntityExtractor
    console.log('[3/7] Extracting entities...')
    const extracted = await EntityExtractor.extract(fileData.rawContent, classification)
    console.log(`  Extracted ${extracted.individuals.length} individuals`)
    if (extracted.errors.length > 0) {
      console.log(`  Extraction errors: ${extracted.errors.length}`)
    }
    runLogger.logExtraction(extracted)

    // Step 4: DeduplicationChecker (skip if --force)
    console.log('[4/7] Checking for existing records...')
    let toEnrich = extracted.individuals
    let alreadyExisting = []

    if (!options.force) {
      const dedupResult = await DeduplicationChecker.check(extracted.individuals)
      toEnrich = dedupResult.toEnrich
      alreadyExisting = dedupResult.alreadyExisting
      console.log(`  Already in database: ${alreadyExisting.length}`)
      console.log(`  New to enrich: ${toEnrich.length}`)
    } else {
      console.log('  --force set, skipping dedup check')
    }
    
    // Apply --limit if specified
    if (options.limit && toEnrich.length > options.limit) {
      console.log(`  Limiting to ${options.limit} individuals`)
      toEnrich = toEnrich.slice(0, options.limit)
    }
    
    runLogger.logDeduplication({ toEnrich, alreadyExisting })

    // Step 5: Enrichment (skip in dry-run)
    let enrichmentResults = { succeeded: [], failed: [], excluded: [] }
    if (!options.dryRun && toEnrich.length > 0) {
      console.log('[5/7] Enriching individuals...')
      enrichmentResults = await EnrichmentRouter.processAll(toEnrich, filePath, runId, runLogger)
      console.log(`  Succeeded: ${enrichmentResults.succeeded.length}`)
      console.log(`  Failed: ${enrichmentResults.failed.length}`)
      console.log(`  Excluded (not UHNW): ${enrichmentResults.excluded.length}`)
    } else if (options.dryRun) {
      console.log('[5/7] Dry-run, skipping enrichment')
    } else {
      console.log('[5/7] No individuals to enrich')
    }
    runLogger.logEnrichment(enrichmentResults)

    // Step 6: RunLogger - write output files
    console.log('[6/7] Writing log files...')
    await runLogger.writeLogs(enrichmentResults, alreadyExisting)
    console.log('  Log files written')

    // Step 7: AdminNotifier (skip in dry-run)
    if (!options.dryRun) {
      console.log('[7/7] Sending admin notification...')
      await AdminNotifier.notify(runLogger.getRunSummary(enrichmentResults, alreadyExisting))
      console.log('  Admin notification sent')
    } else {
      console.log('[7/7] Dry-run, skipping notification')
    }

    console.log('')
    console.log('='.repeat(60))
    console.log('FILE INGESTION COMPLETE')
    console.log('='.repeat(60))
    console.log(`New opportunities: ${enrichmentResults.succeeded.length}`)
    console.log(`Already existing: ${alreadyExisting.length}`)
    console.log(`Log file: ${runLogger.getLogPath()}`)

    process.exit(0)
  } catch (error) {
    console.error('FATAL ERROR:', error.message)
    console.error(error.stack)
    runLogger.logError(error)
    await runLogger.writeLogs({ succeeded: [], failed: [], excluded: [] }, [])
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('Unhandled error:', error)
  process.exit(1)
})