// packages/ai-services/src/schemas/batchArticleAssessmentSchema.js (version 1.0)
import { z } from 'zod'
import { articleAssessmentSchema } from './articleAssessmentSchema.js'

export const batchArticleAssessmentSchema = z.object({
  assessments: z.array(articleAssessmentSchema),
})
