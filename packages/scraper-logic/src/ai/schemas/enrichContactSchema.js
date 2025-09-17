// src/modules/ai/schemas/enrichContactSchema.js (version 1.0)
import { z } from 'zod'

export const enrichContactSchema = z.object({
  enriched_contacts: z.array(
    z.object({
      name: z.string(),
      role_in_event: z.string(),
      company: z.string(),
      email_suggestion: z.string().nullable(),
    })
  ),
})
