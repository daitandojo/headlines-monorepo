// apps/pipeline/src/modules/realtime/index.js (version 4.0.0)
import Pusher from 'pusher'
import { logger } from '@headlines/utils/src/server.js';
import { env } from '@headlines/config/src/server.js'

let pusher
let isRealtimeConfigured = false

export function configureRealtime() {
    if (isRealtimeConfigured) return;

    const { PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER } = env
    if (PUSHER_APP_ID && PUSHER_KEY && PUSHER_SECRET && PUSHER_CLUSTER) {
        pusher = new Pusher({
            appId: PUSHER_APP_ID,
            key: PUSHER_KEY,
            secret: PUSHER_SECRET,
            cluster: PUSHER_CLUSTER,
            useTLS: true,
        });
        isRealtimeConfigured = true;
        logger.info('✅ Real-time notification service (Pusher) configured.')
    } else {
        logger.warn(
            'Pusher credentials not fully configured. Real-time updates will be disabled.'
        )
    }
}


/**
 * A generic helper to stream a new data item to a specific channel.
 * @param {string} channel - The channel to publish on (e.g., 'articles-channel').
 * @param {string} event - The event name to trigger (e.g., 'new-article').
 * @param {object} data - The JSON payload to send.
 */
async function streamNewItem(channel, event, data) {
  if (!isRealtimeConfigured || !pusher) {
    return
  }
  try {
    logger.info(`📢 Streaming new item on channel '${channel}' with event '${event}'.`)
    await pusher.trigger(channel, event, data)
  } catch (error) {
    logger.error(
      { err: error, channel, event },
      'Failed to trigger Pusher real-time event.'
    )
  }
}

/**
 * Streams a newly synthesized event to all connected clients.
 * @param {object} event - The full synthesized event Mongoose document.
 */
export async function streamNewEvent(event) {
  if (typeof event.toRealtimePayload !== 'function') {
    logger.error(
      { eventId: event._id },
      'Event object is missing toRealtimePayload method.'
    )
    return
  }
  const payload = event.toRealtimePayload()
  await streamNewItem('events-channel', 'new-event', payload)
}

/**
 * Streams a newly identified relevant article to all connected clients.
 * @param {object} article - The full article Mongoose document.
 */
export async function streamNewArticle(article) {
  if (typeof article.toRealtimePayload !== 'function') {
    logger.error(
      { articleId: article._id },
      'Article object is missing toRealtimePayload method.'
    )
    return
  }
  const payload = article.toRealtimePayload()
  await streamNewItem('articles-channel', 'new-article', payload)
}
