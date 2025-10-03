// packages/models/src/schemas/emailIntroSchema.js
import { z } from 'zod'

export const emailIntroSchema = z.object({
  greeting: z.string(),
  body: z.string(),
  bullets: z.array(z.string()),
  // The signoff is now an array of strings, with each string representing a line.
  signoff: z.array(z.string()),
})
