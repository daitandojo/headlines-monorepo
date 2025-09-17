// src/modules/ai/schemas/opportunitySchema.js (version 1.0)
import { z } from 'zod'

export const opportunitySchema = z.object({
  opportunities: z.array(
    z.object({
      reachOutTo: z.string(),
      contactDetails: z.object({
        email: z.string().email().nullable(),
        role: z.string().nullable(),
        company: z.string().nullable(),
      }),
      basedIn: z.string(),
      whyContact: z.string(),
      likelyMMDollarWealth: z.number().nullable(),
    })
  ),
})
