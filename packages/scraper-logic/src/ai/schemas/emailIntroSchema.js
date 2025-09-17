// src/modules/ai/schemas/emailIntroSchema.js (version 1.0)
import { z } from 'zod'

export const emailIntroSchema = z.object({
  intro_text: z.string().min(1),
})
