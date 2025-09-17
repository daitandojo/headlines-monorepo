// packages/ai-services/src/schemas/watchlistSuggestionSchema.js (version 2.0.0 - With Search Terms)
import { z } from 'zod'

export const watchlistSuggestionSchema = z.object({
  suggestions: z.array(
    z.object({
      name: z.string(),
      type: z.enum(['person', 'family', 'company']),
      country: z.string(),
      rationale: z.string(),
      sourceEvent: z.string(),
      searchTerms: z.array(z.string()).describe("An array of 2-4 unique, lowercase search terms."),
    })
  ),
})
