// packages/utils/src/tokenTracker.js (version 3.1.0)
import { logger } from './logger.js'

// COST TRACKING FIX: Updated model names and pricing to reflect the actual models
// being used in the pipeline (gpt-5-nano, gpt-5-mini) instead of placeholder names.
// Prices are per 1 MILLION tokens in USD.
const modelPricing = {
  'gpt-5-nano': { input: 0.15, output: 0.4 },
  'gpt-5-mini': { input: 0.5, output: 2.5 },
  // Keep other potential models for future use
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
}

class TokenTracker {
  constructor() {
    this.usage = {}
    this.reset()
  }

  initializeModels(modelKeys = []) {
    this.usage = {}
    const allKnownModels = new Set([...Object.keys(modelPricing), ...modelKeys])
    allKnownModels.forEach((model) => {
      this.usage[model] = { inputTokens: 0, outputTokens: 0, cost: 0 }
    })
  }

  reset() {
    this.initializeModels()
  }

  recordUsage(model, usageData) {
    if (!usageData || !model) return

    const { prompt_tokens, completion_tokens } = usageData

    if (!this.usage[model]) {
      logger.warn(
        `Token usage recorded for an un-priced model: ${model}. Tokens will be tracked, but cost will be $0.`
      )
      this.usage[model] = { inputTokens: 0, outputTokens: 0, cost: 0 }
    }

    this.usage[model].inputTokens += prompt_tokens || 0
    this.usage[model].outputTokens += completion_tokens || 0

    const pricing = modelPricing[model]
    if (pricing) {
      const inputCost = ((prompt_tokens || 0) / 1_000_000) * pricing.input
      const outputCost = ((completion_tokens || 0) / 1_000_000) * pricing.output
      this.usage[model].cost += inputCost + outputCost
    }
  }

  getStats() {
    return this.usage
  }
}

export const tokenTracker = new TokenTracker()
