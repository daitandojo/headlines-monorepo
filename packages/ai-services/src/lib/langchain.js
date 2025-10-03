import { ChatOpenAI } from '@langchain/openai'
import { env, settings } from '@headlines/config/node'
import { logger } from '@headlines/utils-shared'
import { tokenTracker } from '@headlines/utils-server/node'
import { safeExecute } from '@headlines/utils-server/helpers'
import OpenAI from 'openai'

const modelConfig = { response_format: { type: 'json_object' } }

// Temperature parameters have been removed to rely on provider defaults, which is more robust.
export const getHeadlineModel = () =>
  new ChatOpenAI({ modelName: settings.LLM_MODEL_HEADLINE_ASSESSMENT }).bind(modelConfig)
export const getHighPowerModel = () =>
  new ChatOpenAI({ modelName: settings.LLM_MODEL_SYNTHESIS }).bind(modelConfig)
export const getUtilityModel = () =>
  new ChatOpenAI({ modelName: settings.LLM_MODEL_UTILITY }).bind(modelConfig)

const baseClient = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
  timeout: 120 * 1000, // This is a TCP-level timeout, good to have.
  maxRetries: 3,
})

export async function callLanguageModel({
  modelName,
  prompt,
  systemPrompt,
  userContent,
  isJson = true,
  fewShotInputs = [],
  fewShotOutputs = [],
}) {
  const messages = []
  if (systemPrompt) {
    const systemContent =
      typeof systemPrompt === 'object' ? JSON.stringify(systemPrompt) : systemPrompt
    messages.push({ role: 'system', content: systemContent })
  }
  fewShotInputs.forEach((input, i) => {
    const shotContent = typeof input === 'string' ? input : JSON.stringify(input)
    if (shotContent) {
      messages.push({ role: 'user', content: shotContent })
      messages.push({ role: 'assistant', content: fewShotOutputs[i] })
    }
  })
  const finalUserContent = userContent || prompt
  messages.push({ role: 'user', content: finalUserContent })
  logger.trace(
    { payload: { model: modelName, messages_count: messages.length } },
    'Sending payload to LLM.'
  )

  const apiPayload = {
    model: modelName,
    messages: messages,
  }
  if (isJson) {
    apiPayload.response_format = { type: 'json_object' }
  }

  // Use the robust safeExecute with its built-in timeout race.
  // We'll give it an 85-second timeout, slightly less than the safeExecute default.
  const result = await safeExecute(() => baseClient.chat.completions.create(apiPayload), {
    timeout: 85000,
  })

  if (!result) {
    // safeExecute will have already logged the error (timeout or otherwise).
    return { error: 'API call failed or timed out' }
  }

  if (result.usage) {
    tokenTracker.recordUsage(modelName, result.usage)
  }
  const responseContent = result.choices[0].message.content
  logger.trace({ chars: responseContent.length }, 'Received LLM response.')

  if (isJson) {
    try {
      return JSON.parse(responseContent)
    } catch (parseError) {
      logger.error(
        { err: parseError, details: responseContent },
        `LLM response JSON Parse Error for model ${modelName}`
      )
      return { error: 'JSON Parsing Error' }
    }
  }
  return responseContent
}
