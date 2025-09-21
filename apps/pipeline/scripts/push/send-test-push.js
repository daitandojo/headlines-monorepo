// scripts/send-test-push.js (version 1.0)
/**
 * A utility script to send a test push notification to all subscribed users.
 * This is useful for debugging the push notification flow end-to-end.
 *
 * Usage:
 * 1. Ensure your .env file is populated with the correct VAPID keys and MONGO_URI.
 * 2. Run the script from the root of your backend project: `node scripts/send-test-push.js`
 */

import 'dotenv/config'
import webpush from 'web-push'
import mongoose from 'mongoose'
import PushSubscription from '../../models/PushSubscription.js'
import { logger } from '@headlines/utils-server'

const { VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, MONGO_URI } = process.env

async function run() {
  // --- 1. Validate Configuration ---
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT || !MONGO_URI) {
    logger.fatal(
      'Missing required environment variables (VAPID keys and MONGO_URI). Aborting.'
    )
    process.exit(1)
  }
  logger.info('VAPID and MongoDB configuration found.')

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

  // --- 2. Connect to Database ---
  try {
    await mongoose.connect(MONGO_URI)
    logger.info('✅ Successfully connected to MongoDB.')
  } catch (error) {
    logger.fatal({ err: error }, '❌ Failed to connect to MongoDB. Aborting.')
    process.exit(1)
  }

  // --- 3. Fetch Subscriptions ---
  const subscriptions = await PushSubscription.find().lean()
  if (subscriptions.length === 0) {
    logger.warn('No push subscriptions found in the database. Nothing to do.')
    await mongoose.disconnect()
    process.exit(0)
  }
  logger.info(`Found ${subscriptions.length} subscription(s) to notify.`)

  // --- 4. Prepare and Send Notifications ---
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
      .catch((error) => {
        if (error.statusCode === 410 || error.statusCode === 404) {
          logger.warn(
            `Subscription expired. Deleting: ...${subscription.endpoint.slice(-20)}`
          )
          return PushSubscription.deleteOne({ _id: subscription._id })
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

  // --- 5. Disconnect ---
  await mongoose.disconnect()
  logger.info('MongoDB connection closed.')
  process.exit(0)
}

run().catch((err) => {
  logger.fatal({ err }, 'An unhandled error occurred in the script.')
  process.exit(1)
})
