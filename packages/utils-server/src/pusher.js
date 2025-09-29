import Pusher from 'pusher'
import { logger } from './logger.js'
import { env } from '@headlines/config'
let pusher
let isRealtimeConfigured = false
export function configurePusher() {
  if (isRealtimeConfigured) return
  const { PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER } = env
  if (PUSHER_APP_ID && PUSHER_KEY && PUSHER_SECRET && PUSHER_CLUSTER) {
    pusher = new Pusher({
      appId: PUSHER_APP_ID,
      key: PUSHER_KEY,
      secret: PUSHER_SECRET,
      cluster: PUSHER_CLUSTER,
      useTLS: true,
    })
    isRealtimeConfigured = true
    logger.info('✅ Real-time notification service (Pusher) configured.')
  } else {
    logger.warn(
      'Pusher credentials not fully configured. Real-time updates will be disabled.'
    )
  }
}
export async function triggerRealtimeEvent(channel, event, data) {
  if (!isRealtimeConfigured || !pusher) return
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
