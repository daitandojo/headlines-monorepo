// src/modules/ai/schemas/sourceNameSchema.js (version 1.0)
import { z } from 'zod'

export const sourceNameSchema = z.object({
  name: z.string().min(1).describe('The official name of the news publication.'),
})
