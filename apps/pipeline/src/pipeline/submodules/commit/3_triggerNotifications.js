// AFTER
// apps/pipeline/src/pipeline/submodules/commit/3_triggerNotifications.js (Corrected)
import { logger } from '@headlines/utils-server'
import { triggerRealtimeEvent } from '@headlines/utils-server' // <-- CORRECT IMPORT from the shared utility package
import { SynthesizedEvent, Article } from '@headlines/models'
import { settings } from '@headlines/config'
import { sendNotifications } from '../../../modules/notifications/index.js'

export async function triggerNotifications(
  pipelinePayload,
  savedEvents,
  savedOpportunities
) {
  const { assessedCandidates, isDryRun, runStats } = pipelinePayload

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
            'articles-channel',
            'new-article',
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
          'events-channel',
          'new-event',
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
  runStats.eventsEmailed = emailSentCount

  if (emailSentCount > 0 && !isDryRun) {
    await SynthesizedEvent.updateMany(
      { _id: { $in: eventIds } },
      { $set: { emailed: true, email_sent_at: new Date() } }
    )
  }
}
