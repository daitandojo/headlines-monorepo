// packages/models/src/schemas/apiSchemas.js
import { z } from 'zod'

// Schema for /api/user/interactions
export const interactionSchema = z.object({
  itemId: z.string().min(1),
  itemType: z.enum(['article', 'event', 'opportunity']),
  action: z.enum(['favorite', 'unfavorite', 'discard']),
})

// Schema for /api/upload-article
export const articleUploadSchema = z.object({
  item: z.object({
    headline: z.string().min(1, 'Headline is required'),
    article: z.string().min(1, 'Article content is required'),
  }),
})

// Schema for /api/chat and /api/chat/title
export const chatSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
      id: z.string().optional(),
      isThinking: z.boolean().optional(),
      isError: z.boolean().optional(),
    })
  ),
})

// Schema for /api-admin/export
export const exportSchema = z.object({
  entity: z.enum(['opportunities', 'users', 'events', 'articles']),
  fileType: z.enum(['csv', 'xlsx']),
  filters: z.array(z.any()).optional(),
  sort: z.string().optional().nullable(),
})

// Schema for /api/auth/login
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})
