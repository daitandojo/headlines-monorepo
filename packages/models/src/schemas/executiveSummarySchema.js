// packages/ai-services/src/schemas/executiveSummarySchema.js (version 1.0)
import { z } from 'zod'

export const executiveSummarySchema = z.object({
  summary: z.string(),
})
