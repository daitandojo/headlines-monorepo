// packages/scraper-logic/src/ai/AIAgent.js (version 3.2.0)
import { callLanguageModel } from '../../../ai-services/src/index.js'
import { getConfig } from '../config.js';

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

    getConfig().logger.trace(
      { agentConfig: { model, isJson, hasSchema: !!zodSchema } },
      'Initialized new AIAgent.'
    )
  }

  async execute(userContent) {
    let systemPromptContent = this.systemPrompt
    // If the provided prompt is a function, execute it to get the dynamic prompt object
    if (typeof systemPromptContent === 'function') {
      systemPromptContent = systemPromptContent()
    }

    const response = await callLanguageModel({
      modelName: this.model, // Note: The new function expects modelName
      systemPrompt: systemPromptContent,
      userContent,
      isJson: this.isJson,
      fewShotInputs: this.fewShotInputs,
      fewShotOutputs: this.fewShotOutputs,
    })

    if (this.isJson && this.zodSchema && !response.error) {
      const validationResult = this.zodSchema.safeParse(response)
      if (!validationResult.success) {
        getConfig().logger.error(
          {
            details: validationResult.error.flatten(),
            model: this.model,
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
