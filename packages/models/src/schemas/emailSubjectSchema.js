// packages/ai-services/src/schemas/emailSubjectSchema.js (version 1.0)
import { z } from 'zod'

export const emailSubjectSchema = z.object({
  subject_headline: z.string().min(1),
})
