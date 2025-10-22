// packages/models/src/schemas/wealthPredictorSchema.js
import { z } from 'zod'

export const wealthPredictorSchema = z.object({
  is_uhnw: z
    .boolean()
    .describe(
      'True if the individual is likely a UHNW/HNW individual (>$30M), false otherwise.'
    ),
  score: z
    .number()
    .min(0)
    .max(100)
    .describe('Confidence score (0-100) for the is_uhnw prediction.'),
  reasoning: z.string().describe('A brief, one-sentence explanation for the decision.'),
})
