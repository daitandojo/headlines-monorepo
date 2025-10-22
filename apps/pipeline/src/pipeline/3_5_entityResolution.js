// apps/pipeline/src/pipeline/3_5_entityResolution.js
import { logger } from '@headlines/utils-shared'
import { Opportunity, EntityGraph } from '@headlines/models'
import {
  entityExtractorChain,
  oppFactoryChain,
  wealthPredictorChain,
} from '@headlines/ai-services'
import { settings } from '@headlines/config'
import pLimit from 'p-limit'
import colors from 'ansi-colors'

export async function runEntityResolution(pipelinePayload) {
  logger.info('--- STAGE 3.5: PROACTIVE ENTITY RESOLUTION & ENRICHMENT ---')
  const {
    runStatsManager,
    assessedCandidates,
    lean: isLeanMode,
    enrichedArticles,
  } = pipelinePayload

  // --- START OF DEFINITIVE FIX: LEAN MODE LOGIC ---
  // The previous logic incorrectly used `assessedCandidates` in all modes.
  // In lean mode, we must ONLY use the single "champion" article from `enrichedArticles`.
  // In a normal run, we use all relevant articles from the full `assessedCandidates` list.
  let relevantArticles
  if (isLeanMode) {
    relevantArticles = enrichedArticles || []
    logger.warn(
      `[LEAN MODE] Entity resolution will only run on ${relevantArticles.length} champion article(s).`
    )
  } else {
    relevantArticles = (assessedCandidates || []).filter(
      (a) => a.relevance_headline >= settings.HEADLINES_RELEVANCE_THRESHOLD
    )
  }
  // --- END OF DEFINITIVE FIX ---

  if (relevantArticles.length === 0) {
    logger.info('[Entity Resolution] No relevant articles to analyze. Skipping stage.')
    return { success: true, payload: pipelinePayload }
  }

  const textToExtract = relevantArticles
    .map((a) => `${a.headline} - ${a.assessment_headline}`)
    .join('\n')
  const entityResult = await entityExtractorChain({ article_text: textToExtract })
  if (entityResult.error || !entityResult.entities) {
    logger.warn('[Entity Resolution] Failed to extract initial entities from headlines.')
    return { success: true, payload: pipelinePayload }
  }

  const initialEntities = [...new Set(entityResult.entities)]
  logger.info(
    `[Entity Resolution] Initial entities from headlines: ${colors.cyan(initialEntities.join(', '))}`
  )

  const queue = [...initialEntities]
  const vettedEntities = new Set()
  const dossiersToCreate = new Set()

  while (queue.length > 0) {
    const entityName = queue.shift()
    if (vettedEntities.has(entityName.toLowerCase())) continue

    logger.info(
      `\n[Entity Resolution] ➡️ Processing entity: ${colors.magenta.bold(entityName)}`
    )
    vettedEntities.add(entityName.toLowerCase())

    const graphNode = await EntityGraph.findOne({
      $or: [{ name: entityName }, { aliases: entityName }],
    }).lean()

    if (graphNode && graphNode.relationships.length > 0) {
      logger.info(
        `[Entity Resolution]   - ${colors.cyan('Second-Order Discovery:')} Found ${graphNode.relationships.length} relationships for "${entityName}" in Knowledge Graph.`
      )
      for (const rel of graphNode.relationships) {
        if (['Founder Of', 'Owner Of', 'Chairman Of'].includes(rel.type)) {
          if (!vettedEntities.has(rel.targetName.toLowerCase())) {
            logger.info(
              `[Entity Resolution]     - Adding related principal to queue: ${colors.magenta(rel.targetName)}`
            )
            queue.push(rel.targetName)
          }
        }
      }
    }

    const existingOpp = await Opportunity.findOne({ reachOutTo: entityName }).lean()
    if (existingOpp) {
      logger.info(
        `[Entity Resolution]   - Status: ${colors.green('Profile already exists.')}`
      )
      continue
    }

    const context =
      relevantArticles.find((a) => a.headline.includes(entityName))?.headline ||
      textToExtract
    const prediction = await wealthPredictorChain({ name: entityName, context })

    if (prediction.error) {
      logger.warn(`[Entity Resolution]   - Wealth prediction failed for ${entityName}.`)
      continue
    }

    logger.info(
      `[Entity Resolution]   - Wealth Prediction: ${prediction.is_uhnw ? colors.green('High Potential') : colors.yellow('Low Potential')} (Score: ${prediction.score}). Reason: ${prediction.reasoning}`
    )

    if (prediction.is_uhnw) {
      dossiersToCreate.add(entityName)
    }
  }

  const highPotentialTargets = Array.from(dossiersToCreate)
  if (highPotentialTargets.length === 0) {
    logger.info(
      '[Entity Resolution] No new high-potential targets identified for dossier creation.'
    )
    return { success: true, payload: pipelinePayload }
  }

  const limit = pLimit(2)
  const dossierPromises = highPotentialTargets.map((name) =>
    limit(async () => {
      try {
        logger.info(`[Background Task] 🏭 Starting dossier creation for "${name}"...`)
        const oppData = await oppFactoryChain({
          name,
          articles_text: `Initial signal from headlines: ${textToExtract}`,
        })
        if (oppData && !oppData.error && oppData.opportunities.length > 0) {
          const finalOpp = oppData.opportunities[0]
          await Opportunity.updateOne(
            { reachOutTo: finalOpp.reachOutTo },
            { $set: finalOpp },
            { upsert: true }
          )
          logger.info(
            `[Background Task] ✅ Successfully created/updated dossier for "${finalOpp.reachOutTo}".`
          )
        } else {
          logger.warn(
            `[Background Task] ⚠️ Dossier creation failed for "${name}". AI returned: ${JSON.stringify(oppData)}`
          )
        }
      } catch (error) {
        logger.error(
          { err: error, name },
          `[Background Task] A critical error occurred during dossier creation for ${name}.`
        )
      }
    })
  )

  Promise.all(dossierPromises).catch((err) => {
    logger.error(
      { err },
      '[Background Task] One or more background dossier creations failed catastrophically.'
    )
  })

  logger.info(
    `[Entity Resolution] Dispatched ${highPotentialTargets.length} background tasks for dossier creation. Main pipeline continues.`
  )

  return { success: true, payload: pipelinePayload }
}
