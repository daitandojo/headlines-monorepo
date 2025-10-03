// packages/data-access/src/actions/aiSourceDiscovery.js
import { callLanguageModel } from '@headlines/ai-services'
import { instructionSourceDiscovery } from '@headlines/prompts'
import { settings } from '@headlines/config'

const AI_AGENT_MODEL = settings.LLM_MODEL_UTILITY

export async function suggestSections(url) {
  const scrapeResult = {
    success: true,
    content: '<div>Mock Content</div>',
  }

  try {
    const data = await callLanguageModel({
      modelName: AI_AGENT_MODEL,
      systemPrompt: instructionSourceDiscovery,
      userContent: `Analyze the HTML from ${url}:\n\n${scrapeResult.content}`,
      isJson: true,
    })
    return { success: true, data: data.suggestions }
  } catch (e) {
    return { success: false, error: 'AI agent failed to suggest sections.' }
  }
}

export async function suggestSelector(url, targetType) {
  return {
    success: true,
    data: { selector: `div.${targetType}`, confidence: 0.9, sample: 'Sample Text' },
  }
}
