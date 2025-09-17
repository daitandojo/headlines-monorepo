// apps/admin/src/app/api/ai/analyze-source-structure/route.js (version 2.1)
import { NextResponse } from 'next/server';
import { verifyAdmin } from '@headlines/auth/src/index.js';
import { fetchPageWithPlaywright } from '@headlines/scraper-logic/src/browser.js';
import { heuristicallyFindSelectors } from '@headlines/scraper-logic/src/scraper/selectorOptimizer.js';
import { initializeSharedLogic } from '@/lib/init-shared-logic.js';
import * as cheerio from 'cheerio';

export async function POST(request) {
  await initializeSharedLogic();
  const { isAdmin, error: authError } = await verifyAdmin();
  if (!isAdmin) {
    return NextResponse.json({ success: false, error: authError }, { status: 401 });
  }

  await initializeSharedLogic();

  try {
    const { url } = await request.json();
    if (!url) {
      return NextResponse.json({ success: false, error: 'URL is required.' }, { status: 400 });
    }

    const html = await fetchPageWithPlaywright(url, 'SourceStructureAnalyzer');
    if (!html) {
      throw new Error('Failed to fetch page content.');
    }

    const heuristicSuggestions = heuristicallyFindSelectors(html);
    const $ = cheerio.load(html);
    const baseUrl = new URL(url).origin;

    // Live test each suggestion to get a real count and samples
    const finalSuggestions = heuristicSuggestions.map(suggestion => {
        const matchedElements = $(suggestion.selector);
        const samples = [];
        matchedElements.slice(0, 10).each((_, el) => {
            const linkEl = $(el).is('a') ? $(el) : $(el).find('a').first();
            const text = $(el).text().trim().replace(/\s+/g, ' ');
            const href = linkEl.attr('href');
            if (text && href) {
                try {
                    samples.push({ text, href: new URL(href, baseUrl).href });
                } catch(e) { /* ignore invalid urls */ }
            }
        });
        return {
            selector: suggestion.selector,
            count: matchedElements.length,
            samples,
        };
    }).filter(s => s.count > 0);

    return NextResponse.json({ success: true, url, suggestions: finalSuggestions });

  } catch (e) {
    console.error('[API analyze-source-structure Error]', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
