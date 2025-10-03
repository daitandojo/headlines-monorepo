// packages/ai-services/src/schemas/selectorRepairSchema.js (version 1.0)
import { z } from 'zod'

export const selectorRepairSchema = z.object({
  reasoning: z.string(),
  suggested_selectors: z.object({
    headlineSelector: z.string().optional(),
    linkSelector: z.string().optional().nullable(),
    headlineTextSelector: z.string().optional().nullable(),
    articleSelector: z.string().optional(),
  }),
})
