// apps/pipeline/src/pipeline/submodules/commit/3_triggerNotifications.js (version 2.0.0)
import { logger } from '@headlines/utils-shared'
import { triggerRealtimeEvent } from '@headlines/utils-server'
// REFACTOR: Import the new centralized constants.
import { REALTIME_CHANNELS, REALTIME_EVENTS } from '@headlines/utils-shared'
import { SynthesizedEvent, Article } from '@headlines/models'
import { settings } from '@headlines/config'
import { sendNotifications } from '../../../modules/notifications/index.js'

export async function triggerNotifications(
  pipelinePayload,
  savedEvents,
  savedOpportunities
) {
  const { assessedCandidates, isDryRun, runStatsManager } = pipelinePayload

  const eventIds = savedEvents.map((e) => e._id)

  if (!isDryRun) {
    if (assessedCandidates?.length > 0) {
      const relevantArticleLinks = assessedCandidates
        .filter((a) => a.relevance_article >= settings.ARTICLES_RELEVANCE_THRESHOLD)
        .map((a) => a.link)

      if (relevantArticleLinks.length > 0) {
        const relevantArticleDocs = await Article.find({
          link: { $in: relevantArticleLinks },
        })
        for (const articleDoc of relevantArticleDocs) {
          // REFACTOR: Use the imported constants instead of magic strings.
          await triggerRealtimeEvent(
            REALTIME_CHANNELS.ARTICLES,
            REALTIME_EVENTS.NEW_ARTICLE,
            articleDoc.toRealtimePayload()
          )
        }
      }
    }

    if (eventIds.length > 0) {
      const eventDocsForStreaming = await SynthesizedEvent.find({
        _id: { $in: eventIds },
      })
      for (const eventDoc of eventDocsForStreaming) {
        // REFACTOR: Use the imported constants instead of magic strings.
        await triggerRealtimeEvent(
          REALTIME_CHANNELS.EVENTS,
          REALTIME_EVENTS.NEW_EVENT,
          eventDoc.toRealtimePayload()
        )
      }
    }
  }

  const eventsForNotification = isDryRun
    ? savedEvents
    : await SynthesizedEvent.find({ _id: { $in: eventIds } }).lean()

  const { emailSentCount } = await sendNotifications(
    eventsForNotification,
    savedOpportunities
  )
  // REFACTOR: Use the RunStatsManager to set the final count.
  runStatsManager.set('eventsEmailed', emailSentCount)

  if (emailSentCount > 0 && !isDryRun) {
    await SynthesizedEvent.updateMany(
      { _id: { $in: eventIds } },
      { $set: { emailed: true, email_sent_at: new Date() } }
    )
  }
}
