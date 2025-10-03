// packages/ai-services/src/schemas/opportunitySchema.js (version 2.1)
import { z } from 'zod'

export const opportunitySchema = z.object({
  opportunities: z.array(
    // DEFINITIVE FIX: Use .passthrough() to allow the AI to include extra fields
    // without causing a validation error. We will only use the fields we define.
    z.object({
      reachOutTo: z.string().describe("The full name of the individual or family to contact."),
      contactDetails: z.object({
        email: z.string().email().nullable(),
        role: z.string().nullable(),
        company: z.string().nullable(),
      }),
      basedIn: z.string().nullable(),
      whyContact: z.array(z.string()).describe("An array of concise, one-sentence reasons for contact."),
      likelyMMDollarWealth: z.number().nullable(),
      event_key: z.string().describe("The unique key of the source event for this opportunity."),
    }).passthrough()
  ),
})
