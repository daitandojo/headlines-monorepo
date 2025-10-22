// apps/pipeline/scripts/tools/backfill-graph-from-opps.js
/**
 * @command tools:backfill-graph
 * @group Tools
 * @description Backfills the Knowledge Graph using data from existing Opportunity dossiers.
 * @example pnpm run tools:backfill-graph -- --yes
 */
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import colors from 'ansi-colors'
import { initializeScriptEnv } from '../seed/lib/script-init.js'
import { logger } from '@headlines/utils-shared'
import { Opportunity, EntityGraph } from '@headlines/models'
import { closeReader, promptUser } from '../seed/lib/user-interact.js'
import { graphUpdaterChain, entityCanonicalizerChain } from '@headlines/ai-services'
import pLimit from 'p-limit'

const CONCURRENCY_LIMIT = 3

async function updateGraphFromOpportunity(opportunity) {
  const biography = opportunity.profile?.biography
  if (!biography) {
    logger.warn(
      `  -> Skipping graph update for "${opportunity.reachOutTo}" due to missing biography.`
    )
    return 0
  }

  logger.info(
    `  -> 🧠 Analyzing dossier for "${opportunity.reachOutTo}" to update Knowledge Graph...`
  )

  const result = await graphUpdaterChain({ event_summary: biography })
  if (result.error || !result.relationships) {
    logger.warn(
      { error: result.error },
      `  -> Graph Updater AI failed for "${opportunity.reachOutTo}".`
    )
    return 0
  }

  const { relationships, entities } = result
  if (relationships.length === 0) {
    logger.info(`  -> No new relationships found in the dossier.`)
    return 0
  }

  const entityNameIdMap = new Map()
  for (const name of entities) {
    const canonicalResult = await entityCanonicalizerChain({ entity_name: name })
    const canonicalName = canonicalResult.canonical_name || name
    const entityDoc = await EntityGraph.findOneAndUpdate(
      { name: canonicalName },
      { $setOnInsert: { name: canonicalName, type: 'company' }, $addToSet: { aliases: name } },
      { upsert: true, new: true }
    ).lean()
    entityNameIdMap.set(name.toLowerCase(), entityDoc._id)
  }

  const bulkOps = []
  for (const [subject, predicate, object] of relationships) {
    const subjectId = entityNameIdMap.get(subject.toLowerCase())
    const objectId = entityNameIdMap.get(object.toLowerCase())
    if (subjectId && objectId) {
      bulkOps.push({
        updateOne: {
          filter: { _id: subjectId },
          update: {
            $addToSet: {
              relationships: {
                targetId: objectId,
                targetName: object,
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
      `  -> Successfully wrote ${bulkOps.length} relationships for "${opportunity.reachOutTo}".`
    )
    return bulkOps.length
  }
  return 0
}

async function main() {
  const argv = yargs(hideBin(process.argv))
    .option('yes', {
      alias: 'y',
      type: 'boolean',
      description: 'Skip confirmation prompt.',
    })
    .help().argv

  await initializeScriptEnv()
  logger.info('🚀 Starting Knowledge Graph Backfill Script from Opportunities...')

  const opportunities = await Opportunity.find({ 'profile.biography': { $ne: null } })
    .select('reachOutTo profile.biography')
    .lean()

  if (opportunities.length === 0) {
    logger.info('✅ No opportunities with biographies found. Graph is up-to-date.')
    return
  }

  logger.info(
    `Found ${opportunities.length} opportunities with biographies to process for the graph.`
  )

  if (!argv.yes) {
    const answer = await promptUser(
      'Proceed with backfilling the Knowledge Graph from these opportunities? (y/n): '
    )
    if (answer !== 'y') {
      logger.warn('Operation cancelled by user.')
      return
    }
  }

  const limit = pLimit(CONCURRENCY_LIMIT)
  let totalRelationshipsAdded = 0
  const promises = opportunities.map((opp) =>
    limit(async () => {
      const count = await updateGraphFromOpportunity(opp)
      totalRelationshipsAdded += count
    })
  )

  await Promise.all(promises)

  logger.info(
    colors.green(
      `\n✅ Backfill complete. Added a total of ${totalRelationshipsAdded} new relationships to the Knowledge Graph.`
    )
  )
}

main().finally(() => closeReader())