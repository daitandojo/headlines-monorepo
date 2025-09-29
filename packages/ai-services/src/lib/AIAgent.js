import { callLanguageModel } from './langchain.js'
import { logger } from '@headlines/utils-server/node'

export class AIAgent {
  constructor({
    model,
    systemPrompt,
    isJson = true,
    fewShotInputs = [],
    fewShotOutputs = [],
    zodSchema,
  }) {
    if (!model || !systemPrompt) {
      throw new Error('AIAgent requires a model and systemPrompt.')
    }
    this.model = model
    this.systemPrompt = systemPrompt
    this.isJson = isJson
    this.fewShotInputs = fewShotInputs
    this.fewShotOutputs = fewShotOutputs
    this.zodSchema = zodSchema

    logger.trace(
      { agentConfig: { model, isJson, hasSchema: !!zodSchema } },
      'Initialized new AIAgent.'
    )
  }

  async execute(userContent) {
    let systemPromptContent = this.systemPrompt
    // If the provided prompt is a function (for dynamic settings), execute it.
    if (typeof systemPromptContent === 'function') {
      systemPromptContent = systemPromptContent()
    }

    const response = await callLanguageModel({
      modelName: this.model,
      systemPrompt: systemPromptContent,
      userContent,
      isJson: this.isJson,
      fewShotInputs: this.fewShotInputs,
      fewShotOutputs: this.fewShotOutputs,
    })

    if (this.isJson && this.zodSchema && !response.error) {
      const validationResult = this.zodSchema.safeParse(response)
      if (!validationResult.success) {
        logger.error(
          {
            details: validationResult.error.flatten(),
            model: this.model,
            rawResponse: response, // Log the raw response for debugging
          },
          `AI response failed Zod validation.`
        )
        return { error: 'Zod validation failed', details: validationResult.error }
      }
      return validationResult.data
    }

    return response
  }
}
