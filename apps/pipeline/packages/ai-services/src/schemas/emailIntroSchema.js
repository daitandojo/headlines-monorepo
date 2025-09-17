// packages/ai-services/src/schemas/emailIntroSchema.js (version 2.0)
import { z } from 'zod'

export const emailIntroSchema = z.object({
  greeting: z.string(),
  body: z.string(),
  bullets: z.array(z.string()),
  signoff: z.string(),
})
