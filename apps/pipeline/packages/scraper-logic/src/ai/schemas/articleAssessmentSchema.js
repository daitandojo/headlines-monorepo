// packages/scraper-logic/src/ai/schemas/articleAssessmentSchema.js (version 1.1.0)
import { z } from 'zod'

export const articleAssessmentSchema = z.object({
  reasoning: z.object({
    event_type: z.string(),
    is_liquidity_event: z.boolean(),
    beneficiary: z.string(),
  }),
  relevance_article: z
    .number()
    .min(0)
    .max(100)
    .describe('The relevance score of the article content.'),
  assessment_article: z
    .string()
    .min(1)
    .describe('A single, concise sentence assessing the article.'),
  amount: z.number().nullable().optional(),
  key_individuals: z.array(
    z.object({
      name: z.string(),
      role_in_event: z.string(),
      // ROBUSTNESS FIX: Allow company to be null, as the AI sometimes cannot determine it.
      company: z.string().nullable(),
      email_suggestion: z.string().nullable(),
    })
  ),
})
