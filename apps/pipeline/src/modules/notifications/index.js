// File: apps/pipeline/src/modules/notifications/index.js

import { groupItemsByCountry } from '@headlines/utils-shared'
import { logger } from '@headlines/utils-shared'
import { Subscriber, PushSubscription } from '@headlines/models'
import { sendBulkEmails } from './emailDispatcher.js'
import { sendBulkPushNotifications } from './pushService.js'

export async function sendNotifications(newEvents, newOpportunities = []) {
  logger.info(
    `📧 Starting personalized notification dispatch for ${newEvents.length} events and ${newOpportunities.length} opportunities.`
  )

  const [activeSubscribers, allPushSubscriptions] = await Promise.all([
    Subscriber.find({ isActive: true }).lean(),
    PushSubscription.find().lean(),
  ])

  if (activeSubscribers.length === 0) {
    logger.info('No active subscribers found. Skipping notification dispatch.')
    return { emailSentCount: 0, pushSentCount: 0 }
  }

  const pushSubsByUserId = allPushSubscriptions.reduce((acc, sub) => {
    if (!sub.subscriberId) return acc
    const userId = sub.subscriberId.toString()
    if (!acc[userId]) acc[userId] = []
    acc[userId].push(sub)
    return acc
  }, {})

  const eventsByCountry = groupItemsByCountry(newEvents, 'country')
  const opportunitiesByCountry = groupItemsByCountry(newOpportunities, 'basedIn')

  const emailQueue = []
  const pushQueue = []

  for (const user of activeSubscribers) {
    let userEvents = []
    let userOpportunities = []

    // --- START OF THE FIX ---
    if (user.role === 'admin') {
      // If the user is an admin, they get all events and opportunities.
      userEvents = newEvents
      userOpportunities = newOpportunities
      logger.trace(`Admin user ${user.email} is subscribed to all items.`)
    } else {
      // For regular users, filter based on their country subscriptions.
      const userCountries = new Set(
        (user.countries || []).filter((c) => c.active).map((c) => c.name)
      )

      // The original bug was here: this would skip admins. Now it only skips users with no subscriptions.
      if (userCountries.size === 0) continue

      userEvents = filterItemsForUser(eventsByCountry, userCountries)
      userOpportunities = filterItemsForUser(opportunitiesByCountry, userCountries)
    }
    // --- END OF THE FIX ---

    if (userEvents.length === 0 && userOpportunities.length === 0) continue

    if (user.emailNotificationsEnabled && userEvents.length > 0) {
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

function filterItemsForUser(itemsByCountry, userCountries) {
  const userItems = []
  for (const country of userCountries) {
    if (itemsByCountry[country]) {
      userItems.push(...itemsByCountry[country])
    }
  }
  return userItems
}
