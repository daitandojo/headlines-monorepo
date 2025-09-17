// packages/scraper-logic/src/scraper/extractors/source-specific/politiken.js (version 1.0.0)
export const politikenExtractor = ($, el, site) => {
  const element = $(el);
  const h = element.find('h2, h3, h4').first().text().trim()
  const a = element.find('a[href*="/art"]').first().attr('href')
  return h && a ? { headline: h, link: a, source: site.name, newspaper: site.name } : null
}
