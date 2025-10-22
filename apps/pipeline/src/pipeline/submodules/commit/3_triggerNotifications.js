// apps/pipeline/src/pipeline/submodules/commit/3_triggerNotifications.js
import { logger } from '@headlines/utils-shared'
import { triggerRealtimeEvent } from '@headlines/utils-server'
import { REALTIME_CHANNELS, REALTIME_EVENTS } from '@headlines/utils-shared'
import { SynthesizedEvent, Article } from '@headlines/models'
import { settings } from '@headlines/config'
import { sendNotifications } from '../../../modules/notifications/index.js'

export async function triggerNotifications(
  pipelinePayload,
  savedEvents,
  savedOpportunities
) {
  // --- START OF DEFINITIVE FIX ---
  // The isTestMode flag was not being correctly passed through.
  // This fix ensures it is read from the payload and sent to the notification module.
  const {
    assessedCandidates,
    isDryRun,
    runStatsManager,
    test: isTestMode,
  } = pipelinePayload
  // --- END OF DEFINITIVE FIX ---

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
        await triggerRealtimeEvent(
          REALTIME_CHANNELS.EVENTS,
          REALTIME_EVENTS.NEW_EVENT,
          eventDoc.toRealtimePayload()
        )
      }
    }
  }

  const eventsForNotification = savedEvents

  // --- START OF DEFINITIVE FIX ---
  // The isTestMode flag is now correctly passed to sendNotifications.
  const { emailSentCount } = await sendNotifications(
    eventsForNotification,
    savedOpportunities,
    isTestMode // Pass the flag
  )
  // --- END OF DEFINITIVE FIX ---

  runStatsManager.set('eventsEmailed', emailSentCount)

  if (emailSentCount > 0 && !isDryRun) {
    await SynthesizedEvent.updateMany(
      { _id: { $in: eventIds } },
      { $set: { emailed: true, email_sent_at: new Date() } }
    )
  }
}
