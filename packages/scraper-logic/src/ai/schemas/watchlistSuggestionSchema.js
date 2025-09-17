// src/modules/ai/schemas/watchlistSuggestionSchema.js (version 1.0)
import { z } from 'zod'

export const watchlistSuggestionSchema = z.object({
  suggestions: z.array(
    z.object({
      name: z.string(),
      type: z.enum(['person', 'family', 'company']),
      country: z.string(),
      rationale: z.string(),
      sourceEvent: z.string(),
    })
  ),
})
