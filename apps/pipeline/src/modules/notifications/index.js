// apps/pipeline/src/modules/notifications/index.js
import { groupItemsByCountry } from '@headlines/utils-shared'
import { logger } from '@headlines/utils-shared'
import { Subscriber, PushSubscription } from '@headlines/models'
import { sendBulkEmails } from './emailDispatcher.js'
import { sendBulkPushNotifications } from './pushService.js'

function filterItemsForUser(items, userCountries, countryKey) {
  return items.filter((item) => {
    if (!item[countryKey]) {
      return false
    }
    const itemCountries = Array.isArray(item[countryKey])
      ? item[countryKey]
      : String(item[countryKey]).split(',')
    return itemCountries.some((country) => userCountries.has(country.trim()))
  })
}

export async function sendNotifications(
  newEvents,
  newOpportunities = [],
  isTestMode = false
) {
  logger.info(
    `📧 Starting personalized notification dispatch for ${newEvents.length} events and ${newOpportunities.length} opportunities.`
  )
  if (isTestMode) {
    logger.warn('--- TEST MODE: Notifications will ONLY be sent to admin users. ---')
  }

  // --- START OF DEFINITIVE FIX ---
  // The previous logic was flawed. This new logic fetches all active subscribers first,
  // THEN filters them down to ONLY admins if isTestMode is true.
  let subscribersToNotify = await Subscriber.find({ isActive: true }).lean()

  if (isTestMode) {
    subscribersToNotify = subscribersToNotify.filter((user) => user.role === 'admin')
    if (subscribersToNotify.length === 0) {
      logger.warn('TEST MODE: No active admin users found to send test notifications to.')
      return { emailSentCount: 0, pushSentCount: 0 }
    }
  }
  // --- END OF DEFINITIVE FIX ---

  if (subscribersToNotify.length === 0) {
    logger.info('No active subscribers found. Skipping notification dispatch.')
    return { emailSentCount: 0, pushSentCount: 0 }
  }

  const allPushSubscriptions = await PushSubscription.find().lean()
  const pushSubsByUserId = allPushSubscriptions.reduce((acc, sub) => {
    if (!sub.subscriberId) return acc
    const userId = sub.subscriberId.toString()
    if (!acc[userId]) acc[userId] = []
    acc[userId].push(sub)
    return acc
  }, {})

  const emailQueue = []
  const pushQueue = []

  for (const user of subscribersToNotify) {
    let userEvents = []
    let userOpportunities = []

    if (user.role === 'admin') {
      userEvents = newEvents
      userOpportunities = newOpportunities
      logger.trace(`Admin user ${user.email} is subscribed to all items.`)
    } else {
      const userCountries = new Set(
        (user.countries || []).filter((c) => c.active).map((c) => c.name)
      )
      if (userCountries.size === 0) continue
      userEvents = filterItemsForUser(newEvents, userCountries, 'country')
      userOpportunities = filterItemsForUser(newOpportunities, userCountries, 'basedIn')
    }

    if (userEvents.length === 0 && userOpportunities.length === 0) continue

    if (
      user.emailNotificationsEnabled &&
      (userEvents.length > 0 || userOpportunities.length > 0)
    ) {
      emailQueue.push({ user, events: userEvents, opportunities: userOpportunities })
    }

    const userPushSubs = pushSubsByUserId[user._id.toString()] || []
    if (user.pushNotificationsEnabled && userPushSubs.length > 0) {
      pushQueue.push({
        subscriptions: userPushSubs,
        events: userEvents,
        opportunities: userOpportunities,
      })
    }
  }

  if (emailQueue.length === 0 && pushQueue.length === 0) {
    logger.warn(
      'No users were subscribed to the countries of the generated events. No notifications will be sent.'
    )
    return { emailSentCount: 0, pushSentCount: 0 }
  }

  const [emailSentCount, pushSentCount] = await Promise.all([
    sendBulkEmails(emailQueue),
    sendBulkPushNotifications(pushQueue),
  ])

  if (emailSentCount > 0) {
    const bulkOps = emailQueue.map(({ user, events }) => ({
      updateOne: {
        filter: { _id: user._id },
        update: {
          $inc: {
            emailSentCount: 1,
            eventsReceivedCount: events.length,
          },
        },
      },
    }))
    try {
      await Subscriber.bulkWrite(bulkOps)
      logger.info(
        `Successfully updated engagement counters for ${bulkOps.length} subscribers.`
      )
    } catch (error) {
      logger.error({ err: error }, 'Failed to update subscriber engagement counters.')
    }
  }

  logger.info(
    `✅ Notification dispatch complete. Emails Sent: ${emailSentCount}, Push Notifications Sent: ${pushSentCount}.`
  )
  return { emailSentCount, pushSentCount }
}
