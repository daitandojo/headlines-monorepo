// packages/utils-server/src/helpers-next.js (version 1.0.0)
// ARCHITECTURAL REFACTORING: This new file is a Next.js-safe "shim".
// It explicitly re-exports only the functions from the core `helpers.js`
// that are needed and guaranteed to be safe for the Next.js/Vercel environment.
// It is guarded by the 'server-only' directive to prevent client-side bundling.

import 'server-only'

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
    console.error('An unexpected error occurred in a safeExecute block:', error)
    return null
  }
}
