// src/modules/ai/schemas/headlineAssessmentSchema.js (version 1.0)
import { z } from 'zod'

const singleAssessmentSchema = z.object({
  headline_en: z.string(),
  relevance_headline: z.number().min(0).max(100),
  assessment_headline: z.string(),
})

export const headlineAssessmentSchema = z.object({
  assessment: z.array(singleAssessmentSchema),
})
