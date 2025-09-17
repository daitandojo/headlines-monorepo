// packages/ai-services/src/schemas/articlePreAssessmentSchema.js (version 1.0)
import { z } from 'zod'

export const articlePreAssessmentSchema = z.object({
  classification: z.enum(['private', 'public', 'corporate']),
})
