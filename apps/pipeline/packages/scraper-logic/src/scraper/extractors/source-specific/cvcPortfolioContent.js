// packages/scraper-logic/src/scraper/extractors/source-specific/cvcPortfolioContent.js (version 1.0.0)
import { fetchPageContentFromPopup } from '../../../browser.js';
import { getConfig } from '../../../config.js';
import * as cheerio from 'cheerio';

export const cvcPortfolioContentExtractor = async (article, source) => {
    if (!article.customData?.dataKey) {
        return { ...article, enrichment_error: 'Missing data-key for popup interaction.' };
    }

    const buttonSelector = 'button[data-key="' + article.customData.dataKey + '"]';
    const popupHtml = await fetchPageContentFromPopup(source.sectionUrl, buttonSelector);

    if (!popupHtml) {
        return { ...article, enrichment_error: 'Failed to fetch popup HTML for content.' };
    }

    const $ = cheerio.load(popupHtml);
    const content = $('.rte').text().trim().replace(/\s+/g, ' ');

    if (content) {
        article.articleContent = { contents: [content] };
        getConfig().logger.trace({ article: { headline: article.headline } }, '✅ CVC custom content extraction successful.');
    } else {
        article.enrichment_error = 'Could not find content in the CVC popup.';
    }

    return article;
}
