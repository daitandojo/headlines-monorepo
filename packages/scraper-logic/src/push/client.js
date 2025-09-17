// packages/scraper-logic/src/push/client.js (version 2.0.0)
import webpush from 'web-push'
import { getConfig } from '../config.js';
import { env } from '../../../config/src/index.js'

let isPushConfigured = false

function configurePush() {
    if (isPushConfigured) return;

    const { VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = env
    if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && VAPID_SUBJECT) {
      try {
        webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
        isPushConfigured = true
        getConfig().logger.info('✅ Centralized push notification service (VAPID) configured.')
      } catch (error) {
        getConfig().logger.error({ err: error }, '❌ Failed to configure VAPID details.')
      }
    } else {
      getConfig().logger.warn('VAPID keys not fully configured. Push notifications will be disabled.')
    }
}

export { webpush, isPushConfigured, configurePush }
