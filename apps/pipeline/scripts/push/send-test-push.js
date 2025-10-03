// scripts/send-test-push.js
import { initializeScriptEnv } from '../seed/lib/script-init.js'
import { logger } from '@headlines/utils-shared'
import { getAllPushSubscriptions, deletePushSubscription } from '@headlines/data-access'
import { webpush, configurePush } from '@headlines/scraper-logic/push/client.js'

async function run() {
  await initializeScriptEnv()
  configurePush()
  logger.info('🚀 Starting Test Push Notification Script...')

  const subscriptionsResult = await getAllPushSubscriptions()
  if (!subscriptionsResult.success) {
    logger.fatal(
      { err: subscriptionsResult.error },
      '❌ Failed to fetch subscriptions. Aborting.'
    )
    return
  }
  const subscriptions = subscriptionsResult.data

  if (subscriptions.length === 0) {
    logger.warn('No push subscriptions found in the database. Nothing to do.')
    return
  }
  logger.info(`Found ${subscriptions.length} subscription(s) to notify.`)

  const notificationPayload = JSON.stringify({
    title: 'Push Notification Test',
    body: `This is a test message sent at ${new Date().toLocaleTimeString('en-US')}.`,
    url: '/',
    icon: '/icons/icon-192x192.png',
  })

  const promises = subscriptions.map((subscription) =>
    webpush
      .sendNotification(subscription, notificationPayload)
      .then(() => {
        logger.info(
          `✅ Successfully sent notification to endpoint: ...${subscription.endpoint.slice(-20)}`
        )
      })
      .catch(async (error) => {
        if (error.statusCode === 410 || error.statusCode === 404) {
          logger.warn(
            `Subscription expired. Deleting: ...${subscription.endpoint.slice(-20)}`
          )
          await deletePushSubscription({ _id: subscription._id })
        } else {
          logger.error(
            { err: error },
            `❌ Failed to send notification to endpoint: ...${subscription.endpoint.slice(-20)}`
          )
        }
      })
  )

  await Promise.all(promises)
  logger.info('🚀 Test push notification process completed.')
}

run().catch((err) => {
  logger.fatal({ err }, 'An unhandled error occurred in the script.')
})
