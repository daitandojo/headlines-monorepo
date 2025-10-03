// packages/ai-services/src/schemas/synthesisSchema.js (version 1.1)
import { z } from 'zod'

export const synthesisSchema = z.object({
  events: z.array(
    z.object({
      headline: z.string().min(1),
      summary: z.string().min(1),
      advisor_summary: z
        .string()
        .min(1)
        .describe('The one-sentence actionable summary for wealth advisors.'),
      // DEFINITIVE FIX: Add the new classification field to the schema.
      eventClassification: z.string().min(1).describe("The event's classification type."),
      country: z.string().min(1),
      key_individuals: z.array(
        z.object({
          name: z.string(),
          role_in_event: z.string(),
          company: z.string().nullable(),
          email_suggestion: z.string().nullable(),
        })
      ),
    })
  ),
})
