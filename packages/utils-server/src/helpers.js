// packages/utils-server/src/helpers.js (version 2.1.2)
import 'server-only'
import countriesData from './data/countries.json' with { type: 'json' }

const countryNameToIsoMap = new Map(Object.entries(countriesData))

export async function safeExecute(asyncFn, { errorHandler } = {}) {
  try {
    return await asyncFn()
  } catch (error) {
    if (errorHandler) {
      return errorHandler(error)
    }
    console.error(
      'An unexpected error occurred in a safeExecute block without an error handler:',
      error
    )
    return null
  }
}

export async function smartStripHtml(rawHtml) {
  const cheerio = await import('cheerio')
  const $ = cheerio.load(rawHtml)
  $(
    'script, style, link[rel="stylesheet"], noscript, svg, path, footer, header, nav'
  ).remove()
  return $('body').html()
}

export function getCountryCode(countryName) {
  if (!countryName) return null
  return countryNameToIsoMap.get(countryName) || null
}
