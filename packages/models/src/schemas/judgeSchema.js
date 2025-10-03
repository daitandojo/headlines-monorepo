// packages/ai-services/src/schemas/judgeSchema.js (version 1.0)
import { z } from 'zod'

const verdictSchema = z.object({
  identifier: z.string(),
  quality: z.enum(['Excellent', 'Good', 'Acceptable', 'Marginal', 'Poor', 'Irrelevant']),
  commentary: z.string(),
})

export const judgeSchema = z.object({
  event_judgements: z.array(verdictSchema),
  opportunity_judgements: z.array(verdictSchema),
})
