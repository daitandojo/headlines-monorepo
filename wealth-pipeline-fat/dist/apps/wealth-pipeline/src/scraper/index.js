// apps/headlines-pipeline/src/scraper/index.ts
// File 4 of 5
// One-line rationale: Removing unused parameter.
import { BrowserManager, HtmlProcessor } from '@cogniti/scrapers';
import { customExtractors } from './extractors/index.js';
export class HeadlinesScraper {
    browser;
    constructor() {
        this.browser = new BrowserManager();
    }
    async init() {
        await this.browser.init();
    }
    async close() {
        await this.browser.close();
    }
    async scrapeArticle(url) {
        // Removed extractorKey
        const page = await this.browser.newPage();
        try {
            console.log(`[Scraper] Navigating to ${url}...`);
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await this.browser.handleConsent(page);
            const rawHtml = await page.content();
            const extracted = HtmlProcessor.extractContent(rawHtml, url);
            if (!extracted.textContent || extracted.textContent.length < 100) {
                throw new Error('Extracted content too short/empty');
            }
            return {
                url,
                title: extracted.title,
                content: extracted.textContent,
                rawHtml,
            };
        }
        catch (error) {
            console.error(`[Scraper] Failed to scrape ${url}:`, error.message);
            throw error;
        }
        finally {
            await page.close();
        }
    }
    async scrapeHeadlines(url, extractorKey) {
        if (extractorKey && customExtractors[extractorKey]) {
            const page = await this.browser.newPage();
            try {
                await page.goto(url, { waitUntil: 'domcontentloaded' });
                await this.browser.handleConsent(page);
                const html = await page.content();
                return customExtractors[extractorKey](html);
            }
            finally {
                await page.close();
            }
        }
        return [];
    }
}
//# sourceMappingURL=index.js.map