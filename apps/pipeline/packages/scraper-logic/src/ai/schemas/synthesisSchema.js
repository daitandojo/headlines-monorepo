// packages/scraper-logic/src/ai/schemas/synthesisSchema.js (version 1.1.0)
import { z } from 'zod'

export const synthesisSchema = z.object({
  headline: z.string().min(1),
  summary: z.string().min(1),
  country: z.string().min(1),
  key_individuals: z.array(
    z.object({
      name: z.string(),
      role_in_event: z.string(),
      // ROBUSTNESS FIX: Allow company to be null, as the AI sometimes cannot determine it during synthesis.
      company: z.string().nullable(),
      email_suggestion: z.string().nullable(),
    })
  ),
})
