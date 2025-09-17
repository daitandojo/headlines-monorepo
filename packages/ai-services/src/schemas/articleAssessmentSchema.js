// packages/ai-services/src/schemas/articleAssessmentSchema.js (version 1.1)
import { z } from 'zod'

export const articleAssessmentSchema = z.object({
  reasoning: z.object({
    event_type: z.string(),
    is_liquidity_event: z.boolean(),
    beneficiary: z.string(),
  }),
  // NEW FIELD: Added classification to the schema.
  classification: z.enum(['New wealth', 'Wealth detection', 'Interview', 'IPO', 'Other']),
  relevance_article: z.number().min(0).max(100),
  assessment_article: z.string().min(1),
  amount: z.number().nullable().optional(),
  key_individuals: z.array(
    z.object({
      name: z.string(),
      role_in_event: z.string(),
      company: z.string().nullable(),
      email_suggestion: z.string().nullable(),
    })
  ),
})
