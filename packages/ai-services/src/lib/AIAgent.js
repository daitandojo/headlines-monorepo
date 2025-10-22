// packages/ai-services/src/lib/AIAgent.js
import { callLanguageModel } from './langchain.js'
import { logger } from '@headlines/utils-shared'
import { buildPrompt } from './promptBuilder.js'

const MAX_CORRECTION_ATTEMPTS = 1

export class AIAgent {
  constructor({
    model,
    systemPrompt,
    isJson = true,
    fewShotInputs = [],
    fewShotOutputs = [],
    zodSchema,
    responseWrapperKey = null,
  }) {
    if (!model || !systemPrompt) {
      throw new Error('AIAgent requires a model and systemPrompt.')
    }
    this.model = model
    this.isJson = isJson
    this.fewShotInputs = fewShotInputs
    this.fewShotOutputs = fewShotOutputs
    this.zodSchema = zodSchema
    this.systemPrompt = buildPrompt(systemPrompt)
    this.responseWrapperKey = responseWrapperKey
  }

  async execute(userContent) {
    let currentContent = userContent
    try {
      for (let attempt = 0; attempt <= MAX_CORRECTION_ATTEMPTS; attempt++) {
        const response = await callLanguageModel({
          modelName: this.model,
          systemPrompt: this.systemPrompt,
          userContent: currentContent,
          isJson: this.isJson,
          fewShotInputs: this.fewShotInputs,
          fewShotOutputs: this.fewShotOutputs,
        })

        // --- START OF DEFINITIVE FIX ---
        // If the underlying API call returns an error object (e.g., from a timeout),
        // return it gracefully instead of throwing a fatal exception.
        if (response.error) {
          logger.error(
            { agent: this.constructor.name, model: this.model, error: response.error },
            `AIAgent's call to language model failed.`
          )
          return { error: response.error }
        }
        // --- END OF DEFINITIVE FIX ---

        let dataToValidate = response
        if (this.responseWrapperKey && response[this.responseWrapperKey]) {
          dataToValidate = response[this.responseWrapperKey]
        }

        if (!this.zodSchema) {
          return dataToValidate
        }

        const validationResult = this.zodSchema.safeParse(dataToValidate)

        if (validationResult.success) {
          if (attempt > 0) {
            logger.warn(
              { model: this.model, agent: this.constructor.name },
              `AI self-correction succeeded on attempt ${attempt + 1}.`
            )
          }
          return this.responseWrapperKey
            ? { [this.responseWrapperKey]: validationResult.data }
            : validationResult.data
        }

        if (attempt === MAX_CORRECTION_ATTEMPTS) {
          logger.error(
            {
              agentName: this.constructor.name,
              model: this.model,
              validationErrors: validationResult.error.flatten(),
              rawResponseFromAI: response,
            },
            `AI response failed Zod validation after all correction attempts.`
          )
          throw new Error('Zod validation failed permanently')
        }

        logger.warn(
          {
            model: this.model,
            agent: this.constructor.name,
            errors: validationResult.error.flatten(),
          },
          `Zod validation failed on attempt ${attempt + 1}. Initiating self-correction...`
        )

        currentContent = `The previous response you provided was invalid. You MUST correct it. Here was the original request (condensed):\n---\n${userContent.substring(0, 2000)}...\n---\nHere was your invalid JSON response:\n---\n${JSON.stringify(response, null, 2)}\n---\nHere are the specific validation errors you MUST fix:\n---\n${JSON.stringify(validationResult.error.flatten(), null, 2)}\n---\nNow, generate a new, corrected JSON response that strictly adheres to the schema and fixes all the listed errors. Respond ONLY with the corrected JSON object.`
      }
    } catch (error) {
      logger.error(
        { err: error, agent: this.constructor.name, model: this.model },
        `AIAgent execution failed catastrophically.`
      )
      return { error: error.message || 'A critical error occurred in the AI agent.' }
    }
  }
}
