// packages/models/src/schemas/ragResponseSchema.js
import { z } from 'zod'

/**
 * Defines the structured response for the RAG synthesizer agent.
 * The answer is broken down into parts, each with its own source attribution.
 */
export const ragResponseSchema = z.object({
  answer_parts: z.array(
    z.object({
      text: z.string().describe('A segment of the final answer.'),
      source: z
        .enum(['rag', 'wiki', 'search', 'llm'])
        .describe(
          'The source of the text segment. "llm" is used for general connective phrasing.'
        ),
    })
  ),
})
