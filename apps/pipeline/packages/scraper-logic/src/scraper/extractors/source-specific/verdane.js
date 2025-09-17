// packages/scraper-logic/src/scraper/extractors/source-specific/verdane.js (version 1.0.0)
export const verdaneExtractor = ($, el, site) => {
  const element = $(el);
  const linkEl = element.find('a.wp-block-klingit-the-product-block-link')
  const companyName = linkEl.find('h3.wp-block-post-title').text().trim()
  if (companyName) {
    return {
      headline: 'Verdane invests in ' + companyName,
      link: linkEl.attr('href'),
      source: site.name,
      newspaper: site.name,
    }
  }
  return null
}
