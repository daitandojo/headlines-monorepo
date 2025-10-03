// packages/ai-services/src/schemas/batchHeadlineAssessmentSchema.js (version 1.0)
import { z } from 'zod'
import { headlineAssessmentSchema } from './headlineAssessmentSchema.js'

// The batch schema reuses the single assessment schema
export const batchHeadlineAssessmentSchema = z.object({
  assessments: z.array(headlineAssessmentSchema.shape.assessment.element),
})
