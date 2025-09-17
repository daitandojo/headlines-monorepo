// packages/ai-services/src/schemas/clusterSchema.js (version 1.0)
import { z } from 'zod'

export const clusterSchema = z.object({
  events: z.array(
    z.object({
      event_key: z.string(),
      article_ids: z.array(z.string()),
    })
  ),
})
