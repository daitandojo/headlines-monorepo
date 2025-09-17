// src/actions/extract.js
'use server';

import OpenAI from 'openai';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { COMMON_COUNTRIES } from '@/lib/countries';
import { fetchWikipediaSummary } from '@/lib/wikipedia';
import { env } from '@/lib/env.mjs'; // <-- Import the validated env object

let groq;
function getGroqClient() {
  if (!groq) {
    groq = new OpenAI({
      apiKey: env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    });
  }
  return groq;
}

const QUERY_PLANNER_MODEL = 'llama3-8b-8192';
const ANALYST_MODEL = 'llama3-70b-8192';

// --- Agent Prompts ---
const QUERY_PLANNER_PROMPT = `You are a research planning agent. Your task is to analyze the provided "Article Text" and determine the most critical entities to look up on Wikipedia for factual verification and enrichment.

**Instructions:**
1.  Identify the primary subject of the article (a person or a company).
2.  Determine the 1-2 most important, specific proper nouns for which a Wikipedia search would provide essential background context.
3.  Formulate these as precise, high-quality search queries.

Respond ONLY with a valid JSON object with the following structure:
{
  "reasoning": "A brief, one-sentence explanation of your decision-making process.",
  "wikipedia_queries": ["Precise Search Query 1", "Precise Search Query 2"]
}`;

const FINAL_SYNTHESIS_PROMPT = `You are a senior analyst at a top-tier wealth management firm. Your task is to synthesize a business-critical summary from the provided "Article Text", fact-checking and enriching it with the "Wikipedia Context".

**Your Mandate:**
1.  **Prioritize the Article:** The main story and facts must come from the "Article Text".
2.  **Use Wikipedia for Verification & Enrichment:** Use the "Wikipedia Context" to verify names, roles, and foundational facts (like founding dates or parent companies). Add relevant background details from Wikipedia that add value.
3.  **AGGRESSIVELY DISCARD FLUFF:** You MUST ignore all generic marketing language, mission statements, and other non-factual embellishments. Focus only on tangible, factual intelligence (company names, investment relationships, key individuals, strategic moves).
4.  **Deduce Metadata:** Determine the publication name and the primary country of relevance.

Respond ONLY with a valid JSON object with the following structure:
{
  "headline": "A concise, factual headline for the synthesized summary.",
  "publication": "The name of the newspaper or website.",
  "country": "The country this news is about. Choose one from this list: [${COMMON_COUNTRIES.join(', ')}].",
  "business_summary": "The final, synthesized, fact-checked summary, formatted with Markdown."
}`;

export async function scrapeAndExtractWithAI(url) {
  const client = getGroqClient();
  console.log(`[AI Extract] Starting extraction for URL: ${url}`);
  if (!url) {
    return { success: false, error: 'URL is required.' };
  }

  try {
    console.log('[AI Extract] Fetching and parsing content...');
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
      },
    });
    if (!response.ok) {
      console.error(`[AI Extract] Fetch failed with status: ${response.status}`);
      return { success: false, error: `Fetch failed: ${response.status}` };
    }

    const html = await response.text();
    const doc = new JSDOM(html, { url });
    const article = new Readability(doc.window.document).parse();
    if (!article || !article.textContent) {
      console.error('[AI Extract] Readability could not extract content.');
      return { success: false, error: 'Readability could not extract content.' };
    }

    const articleText = article.textContent.trim().substring(0, 12000);
    console.log(`[AI Extract] Extracted ${articleText.length} characters of text.`);

    console.log('[AI Extract] Running Query Planner Agent...');
    const plannerResponse = await client.chat.completions.create({
      model: QUERY_PLANNER_MODEL,
      messages: [
        { role: 'system', content: QUERY_PLANNER_PROMPT },
        { role: 'user', content: `Article Text:\n${articleText}` },
      ],
      response_format: { type: 'json_object' },
    });
    const plan = JSON.parse(plannerResponse.choices[0].message.content);
    console.log('[AI Extract] Planner decided on queries:', plan.wikipedia_queries);

    console.log('[AI Extract] Fetching Wikipedia context...');
    const wikipediaPromises = (plan.wikipedia_queries || [])
      .slice(0, 2)
      .map((entity) => fetchWikipediaSummary(entity));
    const wikipediaResults = await Promise.all(wikipediaPromises);
    const wikipediaContext = wikipediaResults
      .filter((res) => res.success)
      .map((res) => res.summary)
      .join('\n\n---\n\n');
    console.log(
      `[AI Extract] Fetched ${wikipediaResults.filter((r) => r.success).length} Wikipedia summaries.`
    );

    console.log('[AI Extract] Running Final Synthesis Analyst Agent...');
    const finalAnalysis = await client.chat.completions.create({
      model: ANALYST_MODEL,
      messages: [
        {
          role: 'system',
          content: FINAL_SYNTHESIS_PROMPT.replace(
            "[${COMMON_COUNTRIES.join(', ')}]",
            COMMON_COUNTRIES.join(', ')
          ),
        },
        {
          role: 'user',
          content: `URL: ${url}\n\n---ARTICLE TEXT---\n${articleText}\n\n---WIKIPEDIA CONTEXT---\n${wikipediaContext || 'None'}`,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const finalData = JSON.parse(finalAnalysis.choices[0].message.content);
    console.log('[AI Extract] Final synthesis complete.');

    if (!finalData.headline || !finalData.business_summary) {
      console.error('[AI Extract] AI Analyst failed to produce required fields.');
      return {
        success: false,
        error: 'AI Analyst could not reliably synthesize a summary.',
      };
    }

    console.log('[AI Extract] Extraction successful.');
    return { success: true, data: finalData };
  } catch (error) {
    console.error('[AI Extraction Error]', error);
    return { success: false, error: `An unexpected error occurred: ${error.message}` };
  }
}