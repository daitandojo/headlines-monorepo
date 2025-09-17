// packages/data-access/src/actions/upload.js (version 1.0)
'use server'

import { revalidatePath } from '../revalidate.js';
import { SynthesizedEvent, Opportunity } from '@headlines/models';
import { verifySession } from '@headlines/auth';
// DEFINITIVE FIX: Corrected the import path to be explicit.
import {
  assessArticleContent,
  synthesizeEvent,
  generateOpportunitiesFromEvent,
} from '@headlines/scraper-logic/src/ai/index.js';

// This is a simplified, single-item pipeline for uploaded content.
export async function processUploadedArticle(item) {
  const { user, error } = await verifySession();
  if (!user) return { success: false, error: error || 'Authentication required' };

  try {
    // 1. Assess & Enrich (Simulated)
    // We treat the uploaded content as already enriched.
    const enrichedArticle = {
      ...item,
      relevance_article: 100, // Assume high relevance for manual uploads
      assessment_article: item.article,
      articleContent: { contents: [item.article] },
      newspaper: 'Manual Upload',
      country: 'Denmark', // Default or could be a param
      key_individuals: [], // Will be extracted during synthesis
    };

    // 2. Synthesize Event
    const synthesizedResult = await synthesizeEvent([enrichedArticle], [], '', '');
    if (!synthesizedResult || !synthesizedResult.headline) {
      throw new Error('AI failed to synthesize an event from the provided text.');
    }

    const eventToSave = new SynthesizedEvent({
      ...synthesizedResult,
      event_key: `manual-${new Date().toISOString()}`,
      highest_relevance_score: 100,
      source_articles: [{ headline: item.headline, link: '#manual', newspaper: 'Manual Upload' }],
    });

    // 3. Generate Opportunities
    const opportunitiesToSave = await generateOpportunitiesFromEvent(eventToSave, [enrichedArticle]);

    // 4. Save to DB
    await eventToSave.save();
    if (opportunitiesToSave.length > 0) {
      await Opportunity.insertMany(opportunitiesToSave.map(opp => ({...opp, events: [eventToSave._id]})));
    }
    
    await revalidatePath('/events');
    await revalidatePath('/opportunities');

    return { success: true, event: eventToSave.synthesized_headline };
  } catch (e) {
    console.error('[Upload Action Error]:', e);
    return { success: false, error: e.message };
  }
}
