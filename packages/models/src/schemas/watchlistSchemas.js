// packages/models/src/schemas/watchlistSchemas.js
import { z } from 'zod'
import { ENTITY_TYPES, ENTITY_STATUSES } from '../prompt-constants.js'

export const watchlistEntitySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(ENTITY_TYPES),
  status: z.enum(ENTITY_STATUSES).default('candidate'),
  context: z.string().optional(),
  searchTerms: z.array(z.string()).default([]),
  country: z.string().optional(),
  hitCount: z.number().optional(),
  estimatedNetWorthUSD_MM: z.number().optional(),
  primaryCompany: z.string().optional(),
  notes: z.string().optional(),
})
