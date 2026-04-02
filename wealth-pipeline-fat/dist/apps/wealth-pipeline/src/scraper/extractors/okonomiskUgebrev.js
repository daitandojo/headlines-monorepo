import * as cheerio from 'cheerio';
export const okonomiskUgebrevExtractor = (html) => {
    const $ = cheerio.load(html);
    const articles = [];
    $('.post-item').each((_, el) => {
        const $el = $(el);
        const headline = $el.find('h3.entry-title').text().trim();
        const link = $el.find('a.entry-title-link').attr('href');
        if (headline && link) {
            articles.push({ headline, link });
        }
    });
    return articles;
};
//# sourceMappingURL=okonomiskUgebrev.js.map