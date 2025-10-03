// packages/utils-server/src/alerting.js
import { logger } from '@headlines/utils-shared' // CORRECTED IMPORT PATH

/**
 * Simulates sending a structured error alert to an external monitoring service.
 * In a real application, this would be replaced with an SDK call (e.g., Sentry.captureException)
 * or a webhook post to a service like Slack or Better Stack.
 *
 * @param {Error} error - The error object.
 * @param {object} [context={}] - Optional context to include with the alert.
 * @param {string} [context.origin] - The part of the system where the error occurred (e.g., 'API_HANDLER', 'PIPELINE').
 * @param {object} [context.request] - Information about the incoming request.
 * @param {object} [context.user] - Information about the authenticated user.
 */
export function sendErrorAlert(error, context = {}) {
  const alertPayload = {
    timestamp: new Date().toISOString(),
    errorMessage: error.message,
    errorStack: error.stack,
    origin: context.origin || 'Unknown',
    ...context,
  }

  // In a real app, you would replace this with an actual alerting call.
  // For now, we log it with a specific format to simulate an alert being fired.
  logger.fatal(alertPayload, `🚨 CRITICAL ERROR ALERT TRIGGERED 🚨`)

  // Example integrations:
  // if (process.env.SENTRY_DSN) {
  //   Sentry.captureException(error, { extra: context });
  // }
  //
  // if (process.env.SLACK_WEBHOOK_URL) {
  //   await fetch(process.env.SLACK_WEBHOOK_URL, {
  //     method: 'POST',
  //     body: JSON.stringify({ text: `🚨 Error in ${context.origin}: ${error.message}` }),
  //   });
  // }
}
