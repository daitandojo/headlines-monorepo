// packages/ai-services/src/admin-orchestrators.js (NEW FILE)
'use server';

import { fetchPageWithPlaywright } from '@headlines/scraper-logic/browser.js';
import { heuristicallyFindSelectors } from '@headlines/scraper-logic/scraper/selectorOptimizer.js';
import * as cheerio from 'cheerio';
import { smartStripHtml } from '@headlines/utils-server';
import { testHeadlineExtraction } from '@headlines/scraper-logic/scraper/index.js';
import { callLanguageModel } from '@headlines/ai-services';

const getSourceAnalysisPrompt = () => `...`; // Keep the prompt definition here

export async function autoConfigureSourceFromUrl(url) {
  if (!url) throw new Error('URL is required for auto-configuration.');
  
  const rawHtml = await fetchPageWithPlaywright(url);
  const cleanHtml = await smartStripHtml(rawHtml);

  const analysis = await callLanguageModel({
    modelName: process.env.LLM_MODEL_UTILITY || 'gpt-5-nano',
    systemPrompt: getSourceAnalysisPrompt(),
    userContent: `Analyze the following HTML...\n\`\`\`html\n${cleanHtml}\n\`\`\``,
    isJson: true,
  });

  if (analysis.error || !analysis.recipe) {
    throw new Error(analysis.error || 'AI failed to generate a valid recipe.');
  }
  
  const recipe = analysis.recipe;
  const configuration = { /* ... build configuration object ... */ };
  
  const headlines = await testHeadlineExtraction(configuration, rawHtml);
  if (headlines.length === 0) {
    throw new Error('AI analysis complete, but live test found 0 headlines.');
  }

  return {
    success: true,
    configuration,
    testResults: { count: headlines.length, headlines: headlines.slice(0, 5) },
  };
}

export async function analyzeSourceForSelectors(url) {
  if (!url) throw new Error('URL is required for analysis.');

  const html = await fetchPageWithPlaywright(url, 'SourceStructureAnalyzer');
  if (!html) throw new Error('Failed to fetch page content via Playwright.');

  const heuristicSuggestions = heuristicallyFindSelectors(html);
  const $ = cheerio.load(html);
  const baseUrl = new URL(url).origin;

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
        } catch (e) { /* ignore invalid urls */ }
      }
    });
    return {
      selector: suggestion.selector,
      count: matchedElements.length,
      samples,
    };
  }).filter(s => s.count > 0);

  return { success: true, url, suggestions: finalSuggestions };
}