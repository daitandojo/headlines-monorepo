// packages/scraper-logic/src/scraper/extractors/source-specific/cvcPortfolio.js (version 1.0.0)
export const cvcPortfolioExtractor = ($, el, site) => {
  const element = $(el);
  if (element.hasClass('portfolio__card-holder--spotlight')) {
    return null;
  }
  const headingElement = element.find('h2.portfolio__card-heading');
  const companyName = headingElement.text().trim();
  const button = element.find('button.js-portfolio-card');
  
  if (companyName && button.length) {
    return { 
        headline: 'CVC Portfolio Company: ' + companyName, 
        link: site.sectionUrl, 
        source: site.name, 
        newspaper: site.name,
        customData: { dataKey: button.attr('data-key') } 
    };
  }
  return null;
};
