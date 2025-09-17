// packages/scraper-logic/src/ai/agents/headlineAgent.js (version 4.1.3)
// DEFINITIVE FIX: Removed p-limit as it uses server-only modules.
// Using Promise.all is sufficient for this use case.
import { AIAgent } from '../AIAgent.js'
import { headlineAssessmentSchema } from '../schemas/headlineAssessmentSchema.js'
import { env } from '../../../../config/src/index.js'
import { instructionHeadlines } from '../../../../prompts/src/index.js'
import { shotsInputHeadlines } from '../../../../prompts/src/index.js'
import { shotsOutputHeadlines } from '../../../../prompts/src/index.js'
import { getConfig } from '../../config.js'

const getAgent = () =>
  new AIAgent({
    model: env.LLM_MODEL_HEADLINE_ASSESSMENT,
    systemPrompt: instructionHeadlines,
    fewShotInputs: shotsInputHeadlines,
    fewShotOutputs: shotsOutputHeadlines,
    zodSchema: headlineAssessmentSchema,
  })

function findWatchlistHits(text, country) {
  const hits = new Map()
  const lowerText = text.toLowerCase()
  const config = getConfig();
  if (!getConfig().configStore?.watchlistEntities) return []
  
  const createSearchRegex = (term) => new RegExp(`\\b${term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i')
  
  const relevantEntities = Array.from(getConfig().configStore.watchlistEntities.values()).filter(entity => 
      !entity.country || entity.country === country || entity.country === 'Global PE' || entity.country === 'M&A Aggregators'
  );

  for (const entity of relevantEntities) {
      const nameKey = entity.name.toLowerCase();
      if (nameKey.length > 3 && createSearchRegex(nameKey).test(lowerText)) {
          if (!hits.has(entity.name)) hits.set(entity.name, { entity, matchedTerm: nameKey })
      }
      for(const term of (entity.searchTerms || [])) {
          if (term.length > 3 && createSearchRegex(term).test(lowerText)) {
              if (!hits.has(entity.name)) hits.set(entity.name, { entity, matchedTerm: term })
          }
      }
  }
  return Array.from(hits.values())
}

async function assessSingleHeadline(article) {
  const headlineAssessmentAgent = getAgent();
  const hits = findWatchlistHits(article.headline, article.country);
  let headlineWithContext = `[COUNTRY CONTEXT: ${article.country}] ${article.headline}`;
  
  if (hits.length > 0) {
    const hitStrings = hits.map((hit) => `[WATCHLIST HIT: ${hit.entity.name} (matched on '${hit.matchedTerm}')]`).join(' ');
    headlineWithContext = `${hitStrings} ${headlineWithContext}`;
  }

  const response = await headlineAssessmentAgent.execute(headlineWithContext);
  
  let assessment = {
    relevance_headline: 0,
    assessment_headline: 'AI assessment failed.',
    headline_en: article.headline,
  };

  if (response && response.assessment && response.assessment.length > 0) {
    assessment = response.assessment[0];
    let score = assessment.relevance_headline;
    const boost = getConfig().settings.WATCHLIST_SCORE_BOOST;
    if (hits.length > 0 && boost > 0) {
      score = Math.min(100, score + boost);
      assessment.assessment_headline = `Watchlist boost (+${boost}). ${assessment.assessment_headline}`;
    }
    assessment.relevance_headline = score;
  }
  
  return { ...article, ...assessment };
}


export async function assessHeadlinesInBatches(articles) {
  // Using Promise.all provides sufficient concurrency for this operation.
  const assessmentPromises = articles.map(article => 
    assessSingleHeadline(article)
  );
  
  const results = await Promise.all(assessmentPromises);
  return results;
}
