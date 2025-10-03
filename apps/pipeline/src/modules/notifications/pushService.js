// apps/pipeline/src/modules/notifications/pushService.js (version 3.0.0)
import { logger } from '@headlines/utils-shared'
import { PushSubscription } from '@headlines/models'
import { webpush, isPushConfigured } from '@headlines/scraper-logic/push/client.js'

function createPushPayload(events, opportunities) {
  let title = 'New Intelligence Alert'
  let body = ''
  let url = '/events' // Default URL

  const eventCount = events.length
  const oppCount = opportunities.length

  if (eventCount > 0 && oppCount > 0) {
    title = `${eventCount} New Event(s), ${oppCount} New Opportunity/ies`
    body = `Primary Event: ${events[0].synthesized_headline}`
    url = `/events`
  } else if (eventCount > 0) {
    title = `${eventCount} New Wealth Event(s) Detected`
    body = events[0].synthesized_headline
    url = `/events`
  } else if (oppCount > 0) {
    title = `${oppCount} New Opportunity/ies Identified`
    body = `New contact: ${opportunities[0].reachOutTo} (~$${opportunities[0].likelyMMDollarWealth}M)`
    url = `/opportunities`
  }

  return {
    title,
    body,
    url,
    icon: '/icons/icon-192x192.png',
  }
}

export async function sendBulkPushNotifications(pushQueue) {
  if (!isPushConfigured || pushQueue.length === 0) {
    return 0
  }

  logger.info(`Dispatching push notifications to ${pushQueue.length} user group(s)...`)
  let successCount = 0

  const allPromises = []

  for (const { subscriptions, events, opportunities } of pushQueue) {
    const payload = createPushPayload(events, opportunities)
    const notificationPayload = JSON.stringify(payload)

    for (const subscription of subscriptions) {
      const pushPromise = webpush
        .sendNotification(subscription, notificationPayload)
        .then(() => {
          successCount++
          logger.info(`✅ Pushed to endpoint for user ${subscription.subscriberId}`)
        })
        .catch((error) => {
          if (error.statusCode === 410 || error.statusCode === 404) {
            logger.info(
              `Subscription expired or invalid for endpoint. Deleting: ${subscription.endpoint}`
            )
            return PushSubscription.deleteOne({ _id: subscription._id })
          } else {
            logger.error(
              { err: { message: error.message, statusCode: error.statusCode } },
              `Failed to send push notification to user ${subscription.subscriberId}`
            )
          }
        })
      allPromises.push(pushPromise)
    }
  }

  await Promise.all(allPromises)
  return successCount
}
