// packages/scraper-logic/src/scraper/extractors/source-specific/jyllandsPosten.js (version 1.0.0)
export const jyllandsPostenExtractor = ($, el, site) => {
  const element = $(el);
  const headline = element.find('h3').text().trim()
  const link = element.find('a').attr('href')
  if (headline && link) {
    return { headline, link, source: site.name, newspaper: site.name }
  }
  return null
}
