// packages/scraper-logic/src/scraper/dynamicExtractor.js (version 2.0.1)
import { getConfig } from '../config.js';

/**
 * A generic, data-driven extractor that uses declarative fields from a Source document
 * to extract headline and link information from a Cheerio element.
 * @param {import('cheerio').CheerioAPI} $ - The Cheerio instance.
 * @param {import('cheerio').Element} el - The current DOM element matching the headlineSelector.
 * @param {object} source - The full Source document from the database.
 * @returns {{headline: string, link: string}|null} The extracted article data or null if invalid.
 */
export function dynamicExtractor($, el, source) {
  try {
    const mainElement = $(el)

    // 1. Find the link element and extract the href.
    // If linkSelector is null, the mainElement itself is the link.
    const linkElement = source.linkSelector
      ? mainElement.find(source.linkSelector).first()
      : mainElement
    const link = linkElement.attr('href')

    if (!link) {
      return null // A link is mandatory
    }

    // 2. Find the headline text element and extract the text.
    // If headlineTextSelector is null, the mainElement contains the text.
    const textElement = source.headlineTextSelector
      ? mainElement.find(source.headlineTextSelector).first()
      : mainElement

    // 3. Extract the text and clean it by removing any nested HTML tags.
    let headline = textElement.text().trim().replace(/\s+/g, ' ')

    if (!headline) {
      return null // A headline is mandatory
    }

    // 4. Apply the headline template if it exists
    if (source.headlineTemplate) {
      headline = source.headlineTemplate.replace('{{TEXT}}', headline)
    }

    return { headline, link }
  } catch (error) {
    getConfig().logger.error({ err: error, source: source.name }, 'Error during dynamic extraction.')
    return null
  }
}
