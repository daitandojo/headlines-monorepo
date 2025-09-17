// src/modules/ai/schemas/canonicalizerSchema.js (version 1.0)
import { z } from 'zod'

export const canonicalizerSchema = z.object({
  canonical_name: z.string().nullable(),
})
