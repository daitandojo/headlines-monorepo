// packages/ai-services/src/chains/synthesisChain.js
// Uses deepseek-v4-flash for synthesis (no web search needed — pure text synthesis)
import { ChatOpenAI } from "@langchain/openai";
import { instructionSynthesize } from '@headlines/prompts'
import { synthesisSchema } from '@headlines/models/schemas'
import { buildPrompt } from '../lib/promptBuilder.js'
import { logger } from '@headlines/utils-shared'
import { settings, env } from '@headlines/config'
import { tokenTracker } from '@headlines/utils-server/node'

const systemPrompt = buildPrompt(instructionSynthesize)

function getDeepSeekModel() {
  const rawModel = settings.LLM_MODEL_SYNTHESIS || "deepseek/deepseek-v4-flash"
  // DeepSeek API expects bare model names (e.g. deepseek-v4-flash), not OpenRouter format (deepseek/deepseek-v4-flash)
  const modelName = rawModel.replace(/^deepseek\//, '')
  return new ChatOpenAI({
    modelName,
    configuration: {
      baseURL: "https://api.deepseek.com/v1",
      apiKey: env.DEEPSEEK_API_KEY,
    },
    temperature: 0.1,
    maxTokens: 8192,
    response_format: { type: "json_object" },
  })
}

export const synthesisChain = {
  async invoke(input) {
    const { context_json_string } = input;

    try {
      const model = getDeepSeekModel()
      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: context_json_string },
      ]

      const result = await model.invoke(messages)

      // Track token usage
      if (result.usage_metadata) {
        tokenTracker.recordUsage("deepseek/deepseek-v4-flash", {
          prompt_tokens: result.usage_metadata.input_tokens,
          completion_tokens: result.usage_metadata.output_tokens,
          total_tokens: result.usage_metadata.total_tokens,
        })
      }

      const content = result.content
      if (!content) {
        logger.error("Synthesis returned empty response")
        return { error: "Empty synthesis response" }
      }

      let parsed
      try {
        let cleanContent = typeof content === "string" ? content.trim() : content
        if (typeof cleanContent === "string") {
          // Strip markdown JSON code fences: ```json ... ```
          cleanContent = cleanContent.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
          // Strip backtick wrapping: `{...}`
          cleanContent = cleanContent.replace(/^`(.+)`$/s, '$1')
          // Fix double braces (DeepSeek response_format glitch: {{"key": "val"}} → {"key": "val"})
          if (cleanContent.startsWith('{{') && cleanContent.endsWith('}}')) {
            cleanContent = cleanContent.slice(1, -1)
          }
        }

        // Try direct parse first
        if (typeof cleanContent === "string") {
          try {
            parsed = JSON.parse(cleanContent)
          } catch (_) {
            // Direct parse failed — try extracting JSON from text with regex fallback
            // DeepSeek sometimes includes chain-of-thought reasoning before the JSON block
            // even with response_format: json_object
            const jsonMatch = cleanContent.match(/\{[\s\S]*\}/)
            if (!jsonMatch) {
              throw new Error('No JSON object found in response')
            }
            let extracted = jsonMatch[0]
            // Handle double braces inside extracted text
            if (extracted.startsWith('{{') && extracted.endsWith('}}')) {
              extracted = '{' + extracted.slice(2, -2) + '}'
              extracted = extracted.replace(/{{/g, '{').replace(/}}/g, '}')
            }
            parsed = JSON.parse(extracted)
          }
        } else {
          parsed = cleanContent
        }
      } catch (e) {
        logger.error({ err: e, content }, "Failed to parse synthesis JSON")
        return { error: "JSON parse error" }
      }

      // Validate against schema
      const validated = synthesisSchema.parse(parsed)
      return validated
    } catch (error) {
      logger.error({ err: error }, "Synthesis chain error")
      return { error: error.message }
    }
  },
}
