// packages/ai-services/src/schemas/translateSchema.js (version 1.0.0)
import { z } from 'zod'

export const translateSchema = z.object({
  translated_html: z.string().min(1),
})
