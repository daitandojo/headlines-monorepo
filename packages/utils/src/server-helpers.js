// packages/utils/src/server-helpers.js (version 2.0.0)

/**
 * Executes an async function and handles errors gracefully.
 * The calling function is responsible for logging via the errorHandler.
 * @param {() => Promise<any>} asyncFn The async function to execute.
 * @param {{errorHandler: (error: Error) => any}} options Error handling options.
 * @returns {Promise<any>} The result of the function or the error handler.
 */
export async function safeExecute(asyncFn, { errorHandler } = {}) {
  try {
    return await asyncFn()
  } catch (error) {
    if (errorHandler) {
      return errorHandler(error)
    }
    // As a last resort, log to console if no handler is provided.
    console.error('An unexpected error occurred in a safeExecute block without an error handler:', error)
    return null // Default fallback
  }
}

/**
 * Performs "smart stripping" on raw HTML to prepare it for AI analysis.
 * It removes irrelevant tags to reduce noise and token count.
 * @param {string} rawHtml - The full HTML of a page.
 * @returns {Promise<string>} - The cleaned and focused HTML snippet.
 */
export async function smartStripHtml(rawHtml) {
  const cheerio = await import('cheerio')
  const $ = cheerio.load(rawHtml)
  $(
    'script, style, link[rel="stylesheet"], noscript, svg, path, footer, header, nav'
  ).remove()
  return $('body').html()
}
