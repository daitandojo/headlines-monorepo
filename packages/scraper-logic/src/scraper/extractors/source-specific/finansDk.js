// packages/scraper-logic/src/scraper/extractors/source-specific/finansDk.js (version 1.0.0)
export const finansDkExtractor = ($, el, site) => ({
  headline: $(el).text().trim(),
  link: $(el).closest('a').attr('href'),
  source: site.name,
  newspaper: site.name,
})
