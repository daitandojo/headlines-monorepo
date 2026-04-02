import * as cheerio from 'cheerio';
export const politikenExtractor = (html) => {
    const $ = cheerio.load(html);
    const articles = [];
    $('.article-teaser').each((_, el) => {
        const $el = $(el);
        const headline = $el.find('.headline').text().trim();
        const link = $el.find('a').attr('href');
        if (headline && link) {
            articles.push({ headline, link });
        }
    });
    return articles;
};
//# sourceMappingURL=politiken.js.map