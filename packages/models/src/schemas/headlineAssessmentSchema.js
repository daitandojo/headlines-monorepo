// packages/ai-services/src/schemas/headlineAssessmentSchema.js (version 1.0)
import { z } from 'zod'

const singleAssessmentSchema = z.object({
  headline_en: z.string(),
  relevance_headline: z
    .union([z.number(), z.string(), z.null(), z.undefined()])
    .transform((val) => {
      if (val === null || val === undefined) return 0;
      if (typeof val === "number") return val;
      if (typeof val === "string") {
        const parsed = parseFloat(val);
        return isNaN(parsed) ? 0 : Math.min(100, Math.max(0, parsed));
      }
      return 0;
    })
    .pipe(z.number().min(0).max(100)),
  assessment_headline: z.string(),
})

export const headlineAssessmentSchema = z.object({
  assessment: z.array(singleAssessmentSchema),
})
