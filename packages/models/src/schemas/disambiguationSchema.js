// packages/ai-services/src/schemas/disambiguationSchema.js (version 1.0)
import { z } from 'zod'

export const disambiguationSchema = z.object({
  best_title: z.string().nullable(),
})
