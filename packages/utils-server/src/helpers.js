// packages/utils-server/src/helpers.js
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
 * This is a critical utility for protecting against hanging external API calls (e.g., to an LLM).
 * @param {Function} asyncFn - The async function to execute.
 * @param {object} [options] - Options object.
 * @param {Function} [options.errorHandler] - An optional custom error handler.
 * @param {number} [options.timeout=90000] - Timeout in milliseconds. Defaults to 90 seconds.
 * @returns {Promise<any|null>} The result of the async function or null/custom error result.
 */
export async function safeExecute(asyncFn, { errorHandler, timeout = 90000 } = {}) {
  try {
    // Race the async function against a timeout promise.
    return await Promise.race([
      asyncFn(),
      promiseTimeout(timeout, `safeExecute timed out after ${timeout / 1000}s`),
    ])
  } catch (error) {
    if (errorHandler) {
      return errorHandler(error)
    }
    // DEFINITIVE FIX: Use the injected Pino logger instead of console.error
    // to ensure errors are captured and formatted correctly in the main log stream.
    logger.error({ err: error }, 'An unexpected error occurred in a safeExecute block.')
    return null // Return null on failure
  }
}
