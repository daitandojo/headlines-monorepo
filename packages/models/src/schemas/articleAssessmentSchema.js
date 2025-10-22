// packages/models/src/schemas/articleAssessmentSchema.js
import { z } from 'zod'

export const articleAssessmentSchema = z.object({
  reasoning: z.object({
    event_type: z.string(),
    is_liquidity_event: z.boolean(),
    beneficiary: z.string(),
  }),
  // --- START OF DEFINITIVE FIX ---
  // Add the new field to the Zod schema to ensure it's validated and not stripped out.
  one_line_summary: z
    .string()
    .min(1)
    .describe('A single, concise sentence summarizing the core event for clustering.'),
  // --- END OF DEFINITIVE FIX ---
  transactionType: z
    .enum([
      'Leadership Succession',
      'M&A',
      'Divestment',
      'IPO',
      'Funding Round',
      'Wealth Profile',
      'Legal/Dispute',
      'Operational News',
      'Other',
    ])
    .describe('The specific type of financial or business transaction.'),
  relevance_article: z.number().min(0).max(100),
  assessment_article: z.string().min(1),

  amount: z
    .union([z.number(), z.object({ amount: z.number() }).passthrough(), z.null()])
    .transform((val) => {
      if (typeof val === 'number' || val === null) {
        return val
      }
      return val.amount
    })
    .optional(),

  key_individuals: z
    .array(
      z.object({
        name: z.string().nullable(), // Temporarily allow null during parsing
        role_in_event: z.string(),
        company: z.string().nullable().optional(),
        email_suggestion: z.string().nullable().optional(),
      })
    )
    .transform((individuals) => individuals.filter((ind) => ind.name)),

  tags: z
    .array(z.string())
    .describe('An array of 3-5 relevant lowercase tags for the event.'),
})
