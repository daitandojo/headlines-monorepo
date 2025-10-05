// packages/utils-server/src/helpers-next.js
import 'server-only'
import { logger } from '@headlines/utils-shared'

/**
 * Creates a promise that rejects after a specified timeout.
 * @param {number} ms - The timeout duration in milliseconds.
 * @param {string} [customMessage] - An optional message for the timeout error.
 * @returns {Promise<never>} A promise that will reject.
 */
function promiseTimeout(ms, customMessage = 'Operation timed out.') {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(customMessage))
    }, ms)
  })
}

/**
 * Wraps an async function in a try-catch block and a timeout race.
 * This is used by ai-services' safeInvoke to protect against hanging AI calls.
 */
export async function safeExecute(asyncFn, { errorHandler, timeout = 90000 } = {}) {
  try {
    return await Promise.race([
      asyncFn(),
      promiseTimeout(timeout, `safeExecute timed out after ${timeout / 1000}s`),
    ])
  } catch (error) {
    if (errorHandler) {
      return errorHandler(error)
    }
    // DEFINITIVE FIX: Use the shared logger for consistent error handling in Next.js server environments.
    logger.error({ err: error }, 'An unexpected error occurred in a safeExecute block:')
    return null
  }
}
