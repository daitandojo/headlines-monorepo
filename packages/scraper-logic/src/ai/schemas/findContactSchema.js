// src/modules/ai/schemas/findContactSchema.js (version 1.0)
import { z } from 'zod'

export const findContactSchema = z.object({
  email: z.string().email().nullable(),
})
