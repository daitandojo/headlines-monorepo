// packages/models/src/schemas/synthesisSchema.js (CORRECTED)
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
      eventClassification: z.string().min(1).describe("The event's classification type."),
      // DEFINITIVE FIX: The 'country' field must now be an array of strings.
      country: z.array(z.string()).min(1, 'Country array cannot be empty.'),
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
