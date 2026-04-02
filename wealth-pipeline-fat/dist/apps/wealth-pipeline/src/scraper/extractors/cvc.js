// apps/headlines-pipeline/src/scraper/extractors/cvc.ts
import * as cheerio from 'cheerio';
export const cvcPortfolioExtractor = (html) => {
    const $ = cheerio.load(html);
    const articles = [];
    $('.portfolio__card-holder').each((_, el) => {
        const $el = $(el);
        if ($el.hasClass('portfolio__card-holder--spotlight'))
            return;
        const companyName = $el.find('h2.portfolio__card-heading').text().trim();
        const button = $el.find('button.js-portfolio-card');
        if (companyName && button.length) {
            articles.push({
                headline: 'CVC Portfolio Company: ' + companyName,
                link: '#', // CVC uses modals, so we might need a synthetic link or handled differently
                customData: { dataKey: button.attr('data-key') },
            });
        }
    });
    return articles;
};
//# sourceMappingURL=cvc.js.map