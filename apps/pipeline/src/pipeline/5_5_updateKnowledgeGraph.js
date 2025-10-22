// apps/pipeline/src/pipeline/5_5_updateKnowledgeGraph.js
import { logger } from '@headlines/utils-shared'
import { EntityGraph } from '@headlines/models'
import { graphUpdaterChain, entityCanonicalizerChain } from '@headlines/ai-services'

async function upsertEntitiesAndRelationships(event, relationships, entities) {
  // 1. Ensure all entities exist in the graph and get their IDs
  const entityNameIdMap = new Map()
  const entityCanonicalNameMap = new Map()

  for (const name of entities) {
    // Canonicalize each name for consistency
    const canonicalResult = await entityCanonicalizerChain({ entity_name: name })
    const canonicalName = canonicalResult.canonical_name || name

    // Use the canonical name for lookup and creation
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

  // 2. Build bulk write operations for relationships
  const bulkOps = []
  for (const [subject, predicate, object] of relationships) {
    const subjectId = entityNameIdMap.get(subject.toLowerCase())
    const objectId = entityNameIdMap.get(object.toLowerCase())
    const canonicalSubject = entityCanonicalNameMap.get(subject.toLowerCase())
    const canonicalObject = entityCanonicalNameMap.get(object.toLowerCase())

    if (subjectId && objectId && canonicalSubject && canonicalObject) {
      // Add relationship from Subject -> Object
      bulkOps.push({
        updateOne: {
          filter: { _id: subjectId },
          update: {
            $addToSet: {
              relationships: {
                targetId: objectId,
                targetName: canonicalObject,
                type: predicate,
                context: `From event: ${event.synthesized_headline}`,
              },
            },
          },
        },
      })
    }
  }

  if (bulkOps.length > 0) {
    await EntityGraph.bulkWrite(bulkOps, { ordered: false })
    logger.trace(
      { count: bulkOps.length, eventId: event._id },
      `Wrote ${bulkOps.length} relationships to knowledge graph.`
    )
  }
}

export async function runUpdateKnowledgeGraph(pipelinePayload) {
  logger.info('--- STAGE 5.5: UPDATE KNOWLEDGE GRAPH ---')
  const { savedEvents } = pipelinePayload

  if (!savedEvents || savedEvents.length === 0) {
    logger.info('[Knowledge Graph] No new events to process. Skipping.')
    return { success: true, payload: pipelinePayload }
  }

  logger.info(
    `[Knowledge Graph] Analyzing ${savedEvents.length} new events to extract relationships...`
  )
  let relationshipsFound = 0

  // Process events sequentially to avoid overwhelming the AI or DB
  for (const event of savedEvents) {
    try {
      const result = await graphUpdaterChain({ event_summary: event.synthesized_summary })
      if (result.error || !result.relationships) {
        logger.warn(
          { eventId: event._id, error: result.error },
          'Graph Updater AI failed for event.'
        )
        continue
      }

      if (result.relationships.length > 0) {
        await upsertEntitiesAndRelationships(event, result.relationships, result.entities)
        relationshipsFound += result.relationships.length
      }
    } catch (error) {
      // This is a non-blocking stage, so we log the error but don't throw.
      logger.error(
        { err: error, eventId: event._id },
        'A non-critical error occurred during knowledge graph update for one event.'
      )
    }
  }

  logger.info(
    `[Knowledge Graph] Stage complete. Added or updated ${relationshipsFound} relationships.`
  )
  return { success: true, payload: pipelinePayload }
}
