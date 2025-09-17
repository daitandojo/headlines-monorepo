// packages/scraper-logic/src/scraper/extractors/reusable/simple.js (version 1.0.0)
export const simpleExtractor = ($, el, site) => {
  const element = $(el);
  const headline = element.text().trim().replace(/\s+/g, ' ')
  const link = element.attr('href')
  if (headline && link) {
    return { headline, link, source: site.name, newspaper: site.name }
  }
  return null
}
