// apps/pipeline/src/pipeline/submodules/entityTimeline.js
import { SynthesizedEvent, Opportunity } from '@headlines/models'
import { logger } from '@headlines/utils-shared'

/**
 * Builds a cross-run timeline for each entity mentioned in events.
 * Queries past events for the same entity and attaches them to Opportunities.
 */
export async function buildEntityTimelines(events) {
  if (!events || events.length === 0) return

  const entityMap = new Map()

  for (const event of events) {
    const entities = [
      event.primarySubject?.name,
      ...(event.key_individuals || []).map(k => k.name),
      ...(event.transactionDetails?.sellerUBOs || []).map(u => u.name),
      ...(event.transactionDetails?.buyerUBOs || []).map(u => u.name),
    ].filter(Boolean)

    for (const name of entities) {
      if (!entityMap.has(name)) {
        entityMap.set(name, [])
      }
      entityMap.get(name).push({
        eventId: event._id,
        headline: event.synthesized_headline,
        date: event.createdAt || new Date(),
        type: event.triggerClass || 'unknown',
        amountMM: event.transactionDetails?.valuationAtEventUSD ||
          event.transactionDetails?.liquidityFlow?.approxAmountUSD || null,
      })
    }
  }

  // For each entity, find past events and update opportunities
  for (const [name, currentEvents] of entityMap) {
    try {
      // Find past events mentioning this entity
      const pastEvents = await SynthesizedEvent.find({
        _id: { $nin: currentEvents.map(e => e.eventId) },
        $or: [
          { 'primarySubject.name': { $regex: name, $options: 'i' } },
          { 'key_individuals.name': { $regex: name, $options: 'i' } },
        ],
      })
        .select('synthesized_headline createdAt triggerClass transactionDetails')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean()

      const allEvents = [
        ...pastEvents.map(e => ({
          eventId: e._id,
          headline: e.synthesized_headline,
          date: e.createdAt,
          type: e.triggerClass || 'unknown',
          amountMM: e.transactionDetails?.valuationAtEventUSD ||
            e.transactionDetails?.liquidityFlow?.approxAmountUSD || null,
        })),
        ...currentEvents,
      ].sort((a, b) => new Date(b.date) - new Date(a.date))

      // Update opportunities for this entity
      await Opportunity.updateMany(
        { reachOutTo: { $regex: name, $options: 'i' } },
        { $set: { pastEvents: allEvents.slice(0, 15) } }
      )

      logger.info(`[EntityTimeline] Updated timeline for "${name}": ${allEvents.length} total events`)
    } catch (error) {
      logger.warn(`[EntityTimeline] Error for "${name}": ${error.message?.substring(0, 60)}`)
    }
  }
}

export default { buildEntityTimelines }