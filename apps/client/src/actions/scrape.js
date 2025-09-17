"use server";

import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";

/**
 * Scrapes a single URL using a standard fetch call and extracts its main article content.
 * This is a lightweight alternative to using a full browser like Playwright.
 * @param {string} url The URL to scrape.
 * @returns {Promise<{success: boolean, title?: string, content?: string, error?: string}>}
 */
export async function scrapeUrl(url) {
    if (!url) {
        return { success: false, error: "URL is required." };
    }

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            }
        });

        if (!response.ok) {
            return { success: false, error: `Failed to fetch URL. Status: ${response.status}` };
        }

        const html = await response.text();
        const doc = new JSDOM(html, { url });
        const reader = new Readability(doc.window.document);
        const article = reader.parse();

        if (!article || !article.textContent) {
            return { success: false, error: "Could not extract main content from the page." };
        }

        return { success: true, title: article.title, content: article.textContent };

    } catch (error) {
        console.error("Scraping error:", error);
        return { success: false, error: `Failed to scrape URL: ${error.message}` };
    }
}