// File: packages/utils-server/src/helpers.js

/**
 * Creates a promise that rejects after a specified timeout.
 * @param {number} ms - The timeout duration in milliseconds.
 * @param {string} [customMessage] - An optional message for the timeout error.
 * @returns {Promise<never>} A promise that will reject.
 */
function promiseTimeout(ms, customMessage = 'Operation timed out.') {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(customMessage));
    }, ms);
  });
}

/**
 * Wraps an async function in a try-catch block and a timeout race.
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
      promiseTimeout(timeout, `safeExecute timed out after ${timeout / 1000}s`)
    ]);
  } catch (error) {
    if (errorHandler) {
      return errorHandler(error);
    }
    // Log the error centrally, so individual call sites don't have to.
    console.error(
      'An unexpected error occurred in a safeExecute block:',
      error
    );
    return null; // Return null on failure
  }
}

// ... (keep the smartStripHtml function)

/**
 * Strips scripts, styles, and other non-content tags from an HTML string.
 * @param {string} rawHtml - The raw HTML content.
 * @returns {Promise<string>} The cleaned body HTML.
 */
export async function smartStripHtml(rawHtml) {
  // Use dynamic import for cheerio to keep it a lightweight dependency
  const cheerio = await import('cheerio');
  const $ = cheerio.load(rawHtml);
  $(
    'script, style, link[rel="stylesheet"], noscript, svg, path, footer, header, nav'
  ).remove();
  return $('body').html();
}