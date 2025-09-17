// src/modules/ai/schemas/entitySchema.js (version 1.0)
import { z } from 'zod'

export const entitySchema = z.object({
  reasoning: z.string(),
  entities: z.array(z.string()),
})
