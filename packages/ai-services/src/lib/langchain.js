// packages/ai-services/src/lib/langchain.js
import { ChatOpenAI } from '@langchain/openai'
import { env, settings } from '@headlines/config/node'
import { logger } from '@headlines/utils-shared'
import { tokenTracker } from '@headlines/utils-server/node'
import { safeExecute } from '@headlines/utils-server/helpers'
import OpenAI from 'openai'

// This function is kept for the pre-flight check
export function validatePromptBraces(promptText, agentName) {
  const singleBraceRegex = /(?<!\{)\{(?!\{)|(?<!\})\}(?!\})/g
  const match = singleBraceRegex.exec(promptText)
  if (match) {
    const char = match[0]
    const index = match.index
    const contextSnippet = promptText.substring(
      Math.max(0, index - 30),
      Math.min(promptText.length, index + 30)
    )
    const errorMessage = `\n[PROMPT VALIDATION ERROR] for agent/model '${agentName}'.\nFound a single unpaired curly brace '${char}' at position ${index}.\nAll curly braces in instruction prompts must be doubled (e.g., '{{' and '}}') to be treated as literal text and avoid template errors.\n\nContext:\n..."${contextSnippet}"...\n         ^\n`
    throw new Error(errorMessage)
  }
}

const modelConfig = { response_format: { type: 'json_object' } }

// LangChain model exports are kept for potential future use with different features (e.g., streaming)
export const getHeadlineModel = () =>
  new ChatOpenAI({ modelName: settings.LLM_MODEL_HEADLINE_ASSESSMENT }).bind(modelConfig)
export const getHighPowerModel = () =>
  new ChatOpenAI({ modelName: settings.LLM_MODEL_SYNTHESIS }).bind(modelConfig)
export const getUtilityModel = () =>
  new ChatOpenAI({ modelName: settings.LLM_MODEL_UTILITY }).bind(modelConfig)
export const getProModel = () =>
  new ChatOpenAI({ modelName: settings.LLM_MODEL_PRO }).bind(modelConfig)

// Use the official OpenAI client for core, reliable API calls.
const baseClient = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
  timeout: 120 * 1000,
  maxRetries: 3,
})

export async function callLanguageModel({
  modelName,
  systemPrompt,
  userContent,
  isJson = true,
  fewShotInputs = [],
  fewShotOutputs = [],
}) {
  const messages = []
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt })
  }
  fewShotInputs.forEach((input, i) => {
    const shotContent = typeof input === 'string' ? input : JSON.stringify(input)
    if (shotContent) {
      messages.push({ role: 'user', content: shotContent })
      messages.push({ role: 'assistant', content: fewShotOutputs[i] })
    }
  })
  messages.push({ role: 'user', content: userContent })

  const apiPayload = { model: modelName, messages: messages }
  if (isJson) {
    apiPayload.response_format = { type: 'json_object' }
  }

  // --- START OF DEFINITIVE FIX ---
  // The timeout wrapper is now placed around the direct API call,
  // not the entire agent's logic.
  const result = await safeExecute(() => baseClient.chat.completions.create(apiPayload), {
    timeout: 85000,
  })

  if (!result) return { error: 'API call failed or timed out' }
  // --- END OF DEFINITIVE FIX ---

  if (result.usage) tokenTracker.recordUsage(modelName, result.usage)

  const responseContent = result.choices[0]?.message?.content

  if (typeof responseContent !== 'string') {
    logger.error(
      { response: result },
      `LLM response for model ${modelName} was empty or in an unexpected format.`
    )
    return { error: 'LLM response was empty or invalid.' }
  }

  if (isJson) {
    try {
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/)
      if (!jsonMatch)
        throw new Error("No valid JSON object found in the LLM's string response.")
      return JSON.parse(jsonMatch[0])
    } catch (parseError) {
      logger.error(
        { err: parseError, rawContent: responseContent },
        `LLM response JSON Parse Error for model ${modelName}`
      )
      return { error: 'JSON Parsing Error' }
    }
  }
  return responseContent
}