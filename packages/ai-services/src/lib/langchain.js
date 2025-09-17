// packages/ai-services/src/lib/langchain.js (version 3.1.0)
import { ChatOpenAI } from '@langchain/openai'
import { env, settings } from '@headlines/config/server'
import { logger } from '@headlines/utils/server';
import { safeExecute } from '@headlines/utils/server';
import { tokenTracker } from '@headlines/utils/server';
import OpenAI from 'openai'

// --- Model Instances ---
const modelConfig = {
  response_format: { type: 'json_object' },
}

// These are now functions that will be called after settings are initialized.
export const getHeadlineModel = () => new ChatOpenAI({
  modelName: settings.LLM_MODEL_HEADLINE_ASSESSMENT,
}).bind(modelConfig)

export const getHighPowerModel = () => new ChatOpenAI({
  modelName: settings.LLM_MODEL_ARTICLE_ASSESSMENT,
}).bind(modelConfig)

export const getUtilityModel = () => new ChatOpenAI({
  modelName: settings.LLM_MODEL_UTILITY,
}).bind(modelConfig)


// --- Central LLM Invocation Function ---
const baseClient = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    timeout: 120 * 1000,
    maxRetries: 3,
});

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
    const systemContent = typeof systemPrompt === 'object' ? JSON.stringify(systemPrompt) : systemPrompt
    messages.push({ role: 'system', content: systemContent })
  }

  fewShotInputs.forEach((input, i) => {
    const shotContent = typeof input === 'string' ? input : JSON.stringify(input)
    if (shotContent) {
      messages.push({ role: 'user', content: shotContent })
      messages.push({ role: 'assistant', content: fewShotOutputs[i] })
    }
  })

  const finalUserContent = userContent || prompt;
  messages.push({ role: 'user', content: finalUserContent })
  
  logger.trace({ payload: { model: modelName, messages_count: messages.length } }, 'Sending payload to LLM.')

  const result = await safeExecute(() =>
    baseClient.chat.completions.create({
        model: modelName,
        messages: messages,
        response_format: isJson ? { type: 'json_object' } : undefined,
    })
  );

  if (!result) return { error: 'API call failed' };

  if (result.usage) {
    tokenTracker.recordUsage(modelName, result.usage);
  }

  const responseContent = result.choices[0].message.content;
  logger.trace({ chars: responseContent.length }, 'Received LLM response.');

  if (isJson) {
    try {
      return JSON.parse(responseContent);
    } catch (parseError) {
      logger.error({ err: parseError, details: responseContent }, `LLM response JSON Parse Error for model ${modelName}`);
      return { error: 'JSON Parsing Error' };
    }
  }

  return responseContent;
}
