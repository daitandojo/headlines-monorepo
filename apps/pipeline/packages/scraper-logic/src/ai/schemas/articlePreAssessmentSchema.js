// src/modules/ai/schemas/articlePreAssessmentSchema.js (version 1.0)
import { z } from 'zod'

export const articlePreAssessmentSchema = z.object({
  classification: z.enum(['private', 'public', 'corporate']),
})
