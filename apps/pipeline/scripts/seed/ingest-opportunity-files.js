// apps/pipeline/scripts/seed/ingest-opportunity-files.js
/**
 * @command seed:ingest-opportunities
 * @group Seed
 * @description Ingests Opportunity profiles from .js files in the opportunity_seeds directory using AI-powered merging.
 * @example pnpm run seed:ingest-opportunities
 * @example pnpm run seed:ingest-opportunities -- --dry-run
 */
import fs from 'fs/promises'
import path from 'path'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import colors from 'ansi-colors'
import { initializeScriptEnv } from './lib/script-init.js'
import { logger } from '@headlines/utils-shared'
import { Opportunity, EntityGraph } from '@headlines/models'
import { closeReader, promptUser } from './lib/user-interact.js'
import {
  oppFactoryChain,
  dossierUpdateChain,
  graphUpdaterChain,
  entityCanonicalizerChain,
} from '@headlines/ai-services'

const SEED_DIR = path.resolve(process.cwd(), 'apps/pipeline/opportunity_seeds')

async function updateGraphFromOpportunity(opportunity) {
  const biography = opportunity.profile?.biography
  if (!biography) {
    logger.warn(
      `  -> Skipping graph update for "${opportunity.reachOutTo}" due to missing biography.`
    )
    return
  }

  logger.info(
    `  -> 🧠 Updating Knowledge Graph for "${opportunity.reachOutTo}" from dossier...`
  )

  const result = await graphUpdaterChain({ event_summary: biography })
  if (result.error || !result.relationships) {
    logger.warn(
      { error: result.error },
      `  -> Graph Updater AI failed for "${opportunity.reachOutTo}".`
    )
    return
  }

  const { relationships, entities } = result

  if (relationships.length === 0) {
    logger.info(`  -> No new relationships found in the dossier for the graph.`)
    return
  }

  const entityNameIdMap = new Map()
  const entityCanonicalNameMap = new Map()

  for (const name of entities) {
    const canonicalResult = await entityCanonicalizerChain({ entity_name: name })
    const canonicalName = canonicalResult.canonical_name || name
    const entityDoc = await EntityGraph.findOneAndUpdate(
      { name: canonicalName },
      {
        $setOnInsert: { name: canonicalName, type: 'company' },
        $addToSet: { aliases: name },
      },
      { upsert: true, new: true }
    ).lean()
    entityNameIdMap.set(name.toLowerCase(), entityDoc._id)
    entityCanonicalNameMap.set(name.toLowerCase(), canonicalName)
  }

  const bulkOps = []
  for (const [subject, predicate, object] of relationships) {
    const subjectId = entityNameIdMap.get(subject.toLowerCase())
    const objectId = entityNameIdMap.get(object.toLowerCase())
    const canonicalSubject = entityCanonicalNameMap.get(subject.toLowerCase())
    const canonicalObject = entityCanonicalNameMap.get(object.toLowerCase())

    if (subjectId && objectId && canonicalSubject && canonicalObject) {
      bulkOps.push({
        updateOne: {
          filter: { _id: subjectId },
          update: {
            $addToSet: {
              relationships: {
                targetId: objectId,
                targetName: canonicalObject,
                type: predicate,
                context: `From dossier for ${opportunity.reachOutTo}`,
              },
            },
          },
        },
      })
    }
  }

  if (bulkOps.length > 0) {
    await EntityGraph.bulkWrite(bulkOps, { ordered: false })
    logger.info(
      `  -> Successfully wrote ${bulkOps.length} relationships to the Knowledge Graph.`
    )
  }
}

async function main() {
  const argv = yargs(hideBin(process.argv))
    .option('dry-run', {
      type: 'boolean',
      description: 'Simulate the run without writing to the DB or renaming files.',
    })
    .option('yes', {
      alias: 'y',
      type: 'boolean',
      description: 'Skip confirmation prompt.',
    })
    .help().argv

  await initializeScriptEnv()
  logger.info('🚀 Starting AI-Powered Opportunity file ingestion script...')

  let filesToProcess = []
  try {
    const allFiles = await fs.readdir(SEED_DIR)
    filesToProcess = allFiles.filter((file) => file.endsWith('.js'))
  } catch (error) {
    if (error.code === 'ENOENT') {
      logger.error(`Seed directory not found at: ${SEED_DIR}`)
      logger.error('Please create the directory and place your seed files inside.')
      return
    }
    throw error
  }

  if (filesToProcess.length === 0) {
    logger.info('✅ No new opportunity files (.js) found to process.')
    return
  }

  logger.info(`Found ${filesToProcess.length} opportunity file(s) to process.`)

  if (!argv.yes && !argv.dryRun) {
    const answer = await promptUser('Proceed with AI-powered database ingestion? (y/n): ')
    if (answer !== 'y') {
      logger.warn('Operation cancelled by user.')
      return
    }
  }

  for (const file of filesToProcess) {
    const filePath = path.join(SEED_DIR, file)
    logger.info(colors.cyan(`\n--- Processing file: ${file} ---`))
    let successInFile = true

    try {
      const importedModule = await import(filePath)

      let opportunitiesInData = []
      if (importedModule.default) {
        if (Array.isArray(importedModule.default)) {
          opportunitiesInData = importedModule.default
        } else if (
          typeof importedModule.default === 'object' &&
          importedModule.default.reachOutTo
        ) {
          opportunitiesInData = [importedModule.default]
        } else {
          opportunitiesInData = Object.values(importedModule.default)
        }
      } else {
        opportunitiesInData = Object.values(importedModule)
      }

      logger.info(
        `  -> Found ${opportunitiesInData.length} opportunity object(s) in this file.`
      )

      for (const newData of opportunitiesInData) {
        if (!newData || !newData.reachOutTo) {
          logger.warn('  -> Skipping an invalid object in the file (missing reachOutTo).')
          continue
        }

        logger.info(`  -> Processing individual: "${newData.reachOutTo}"`)

        const existingOpp = await Opportunity.findOne({
          reachOutTo: newData.reachOutTo,
        }).lean()

        let finalOpportunityData
        let aiResult

        const newIntelligenceText = newData.whyContact.join('\n')

        if (existingOpp) {
          logger.info(`    -> Found existing profile. Calling Dossier Update Agent...`)
          aiResult = await dossierUpdateChain({
            existing_dossier_json: JSON.stringify(existingOpp),
            new_intelligence_text: newIntelligenceText,
          })
        } else {
          logger.info(`    -> No existing profile. Calling Opportunity Factory Agent...`)
          aiResult = await oppFactoryChain({
            name: newData.reachOutTo,
            articles_text: newIntelligenceText,
          })
        }

        if (
          aiResult.error ||
          !aiResult.opportunities ||
          aiResult.opportunities.length === 0
        ) {
          throw new Error(
            `AI agent failed for ${newData.reachOutTo}. Reason: ${aiResult.error || 'No opportunities returned.'}`
          )
        }

        finalOpportunityData = aiResult.opportunities[0]

        if (!argv.dryRun) {
          await Opportunity.updateOne(
            { reachOutTo: finalOpportunityData.reachOutTo },
            { $set: finalOpportunityData },
            { upsert: true }
          )
          logger.info(
            colors.green(
              `    ✅ Successfully created/updated opportunity for "${finalOpportunityData.reachOutTo}".`
            )
          )
          await updateGraphFromOpportunity(finalOpportunityData)
        } else {
          logger.info(
            colors.yellow(
              `    [DRY RUN] Would have created/updated opportunity for "${finalOpportunityData.reachOutTo}".`
            )
          )
        }
      }

      if (!argv.dryRun && successInFile) {
        const newPath = filePath.replace('.js', '.uploaded')
        await fs.rename(filePath, newPath)
        logger.info(`  -> Renamed file to: ${path.basename(newPath)}`)
      } else if (argv.dryRun) {
        logger.info(
          colors.yellow('  [DRY RUN] Would have renamed the file to .uploaded.')
        )
      }
    } catch (error) {
      successInFile = false
      logger.error(
        { err: error },
        `❌ Failed to process file ${file}. It will be skipped and NOT renamed.`
      )
    }
  }

  logger.info('\n✅ AI-powered ingestion script finished.')
}

main().finally(() => closeReader())
