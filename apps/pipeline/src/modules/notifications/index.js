// apps/pipeline/src/modules/notifications/index.js (version 2.2.0)
import { groupItemsByCountry } from '@headlines/utils/src/server.js';
import { logger } from '@headlines/utils/src/server.js';
import { Subscriber, PushSubscription } from '@headlines/models/src/index.js'
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
    logger.info('No active subscribers found. Skipping notification dispatch.');
    return { emailSentCount: 0, pushSentCount: 0 };
  }

  const pushSubsByUserId = allPushSubscriptions.reduce((acc, sub) => {
    if (!sub.subscriberId) return acc;
    const userId = sub.subscriberId.toString();
    if (!acc[userId]) acc[userId] = [];
    acc[userId].push(sub);
    return acc;
  }, {});

  const eventsByCountry = groupItemsByCountry(newEvents, 'country');
  const opportunitiesByCountry = groupItemsByCountry(newOpportunities, 'basedIn');

  const emailQueue = [];
  const pushQueue = [];

  for (const user of activeSubscribers) {
    const userCountries = new Set(
      (user.countries || []).filter((c) => c.active).map((c) => c.name)
    );
    if (userCountries.size === 0) continue;

    const userEvents = filterItemsForUser(eventsByCountry, userCountries);
    const userOpportunities = filterItemsForUser(opportunitiesByCountry, userCountries);

    if (userEvents.length === 0 && userOpportunities.length === 0) continue;

    if (user.emailNotificationsEnabled && userEvents.length > 0) { // Only queue email if there are events
      emailQueue.push({ user, events: userEvents, opportunities: userOpportunities });
    }
    
    const userPushSubs = pushSubsByUserId[user._id.toString()] || [];
    if (user.pushNotificationsEnabled && userPushSubs.length > 0) {
      pushQueue.push({ subscriptions: userPushSubs, events: userEvents, opportunities: userOpportunities });
    }
  }
  
  if (emailQueue.length === 0 && pushQueue.length === 0) {
      logger.warn('No users were subscribed to the countries of the generated events. No notifications will be sent.');
      return { emailSentCount: 0, pushSentCount: 0 };
  }

  const [emailSentCount, pushSentCount] = await Promise.all([
    sendBulkEmails(emailQueue),
    sendBulkPushNotifications(pushQueue),
  ]);
  
  // --- UPDATE COUNTERS ---
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
    }));
    try {
      await Subscriber.bulkWrite(bulkOps);
      logger.info(`Successfully updated engagement counters for ${bulkOps.length} subscribers.`);
    } catch (error) {
      logger.error({ err: error }, "Failed to update subscriber engagement counters.");
    }
  }

  logger.info(
    `✅ Notification dispatch complete. Emails Sent: ${emailSentCount}, Push Notifications Sent: ${pushSentCount}.`
  );
  return { emailSentCount, pushSentCount };
}

function filterItemsForUser(itemsByCountry, userCountries) {
  const userItems = [];
  for (const country of userCountries) {
    if (itemsByCountry[country]) {
      userItems.push(...itemsByCountry[country]);
    }
  }
  return userItems;
}
