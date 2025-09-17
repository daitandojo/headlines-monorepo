// packages/scraper-logic/src/scraper/extractors/source-specific/okonomiskUgebrev.js (version 1.0.0)
export const okonomiskUgebrevExtractor = ($, el, site) => {
  const element = $(el);
  const headline = element.find('h5.elementor-heading-title').text().trim().replace(/\s+/g, ' ');
  const link = element.attr('href');
  
  if (headline && link) {
    return { headline, link, source: site.name, newspaper: site.name };
  }
  return null;
};
