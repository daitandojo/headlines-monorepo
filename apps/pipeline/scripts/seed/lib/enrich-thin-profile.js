// apps/pipeline/scripts/seed/lib/enrich-thin-profile.js
import { callLanguageModel } from '../../../../../packages/ai-services/src/index.js';
import { settings } from '../../../../../packages/config/src/server.js';
import { logger } from '../../../../../packages/utils/src/server.js';
import { z } from 'zod';

const verificationSchema = z.object({
  is_significant_figure: z.boolean().describe("True if the person is a known business figure (founder, CEO, major owner)."),
  verification_summary: z.string().describe("A neutral, one-sentence summary of the person's primary role based on general knowledge."),
});

const enrichmentSchema = z.object({
  summary: z.string().min(20).describe("The generated 2-3 sentence background summary."),
});

const createFallbackText = (person) => `This is a wealth profile for ${person.name}, a notable figure in the ${person.industry} sector, primarily associated with the company ${person.primaryCompany}. Their estimated wealth is approximately $${person.wealthMillionsUSD}M USD.`;

/**
 * Uses a robust, two-step AI process to generate a background summary for an individual
 * when no pre-written text is available, minimizing hallucination risk.
 * @param {object} person - A person object from the rich list.
 * @returns {Promise<{generated_background: string}>} The AI-generated or fallback text.
 */
export async function enrichThinProfile(person) {
  logger.info(`  -> AI Enrichment (2-Step): Verifying significance of ${person.name}...`);

  // --- STEP 1: NEUTRAL VERIFICATION ---
  const verificationPrompt = `You are a neutral fact-checker. Based on your general knowledge, is the following person a significant business figure (founder, CEO, major owner, etc.)? Provide a boolean answer and a brief, neutral summary of their primary role.

Respond ONLY with a valid JSON object: {"is_significant_figure": boolean, "verification_summary": "One sentence summary."}`;
  
  const verificationUserContent = `Person: ${person.name}\nCompany / Industry: ${person.primaryCompany}`;

  try {
    const verificationResponse = await callLanguageModel({
        modelName: settings.LLM_MODEL_UTILITY,
        systemPrompt: verificationPrompt,
        userContent: verificationUserContent,
        isJson: true,
    });

    const validation = verificationSchema.safeParse(verificationResponse);
    if (!validation.success || !validation.data.is_significant_figure) {
        logger.warn(`  -> Verification FAILED for ${person.name}. The AI did not recognize them as a significant business figure. Using fallback text.`);
        if(!validation.success) logger.error({ err: validation.error.flatten(), raw_response: verificationResponse }, 'Verification response failed Zod validation.');
        return { generated_background: createFallbackText(person) };
    }
    
    const verifiedSummary = validation.data.verification_summary;
    logger.info(`  -> Verification PASSED for ${person.name}: "${verifiedSummary}"`);

    // --- STEP 2: CONDITIONAL ENRICHMENT ---
    logger.info(`  -> AI Enrichment: Generating full background for verified figure ${person.name}...`);
    const enrichmentPrompt = `You are a financial biographer. You have already verified the subject's identity. Now, synthesize the verified summary with the provided private financial data to write a concise, professional background summary (2-3 sentences) suitable for a rich list publication. Focus on their business history, key achievements, and the source of their wealth.

Respond ONLY with a valid JSON object: {"summary": "Your generated text."}`;

    const enrichmentUserContent = `
        Verified Summary: "${verifiedSummary}"
        
        Private Financial Data:
        - Name: ${person.name}
        - Primary Company / Industry: ${person.primaryCompany} / ${person.industry}
        - Estimated Wealth: $${person.wealthMillionsUSD}M USD
        - Country: ${person.country}
    `;

    const enrichmentResponse = await callLanguageModel({
        modelName: settings.LLM_MODEL_UTILITY,
        systemPrompt: enrichmentPrompt,
        userContent: enrichmentUserContent,
        isJson: true,
    });
    
    const enrichmentValidation = enrichmentSchema.safeParse(enrichmentResponse);

    if (!enrichmentValidation.success) {
      logger.error({ err: enrichmentValidation.error.flatten(), raw_response: enrichmentResponse }, 'Enrichment response failed Zod validation.');
      throw new Error('AI enrichment response failed validation.');
    }

    // DEFINITIVE FIX: Log the final generated background.
    logger.info({ generated_background: enrichmentValidation.data.summary }, `Generated background for ${person.name}`);
    return { generated_background: enrichmentValidation.data.summary };

  } catch (error) {
    logger.error(
      { err: error },
      `Full AI enrichment process failed for ${person.name}. Using fallback text.`
    );
    return { generated_background: createFallbackText(person) };
  }
}
