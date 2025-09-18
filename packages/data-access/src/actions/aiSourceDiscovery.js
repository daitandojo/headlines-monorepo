// packages/data-access/src/actions/aiSourceDiscovery.js
'use server'

import { verifyAdmin } from '@headlines/auth'
import { scrapeUrl } from './scrape' // This action will need to be created/moved
import { callLanguageModel } from '@headlines/ai-services'
import { instructionSourceDiscovery } from '@headlines/prompts'
import { settings } from '@headlines/config/server'

const AI_AGENT_MODEL = settings.LLM_MODEL_UTILITY

export async function suggestSections(url) {
  const { isAdmin, error } = await verifyAdmin()
  if (!isAdmin) return { success: false, error }

  const scrapeResult = await scrapeUrl(url)
  if (!scrapeResult.success) {
    return scrapeResult
  }

  try {
    const data = await callLanguageModel({
      modelName: AI_AGENT_MODEL,
      systemPrompt: instructionSourceDiscovery,
      userContent: `Analyze the HTML from ${url}:\n\n${scrapeResult.content.substring(0, 15000)}`,
      isJson: true,
    })
    return { success: true, data: data.suggestions }
  } catch (e) {
    return { success: false, error: 'AI agent failed to suggest sections.' }
  }
}

// NOTE: suggestSelector logic is complex and might need its own file if it grows
export async function suggestSelector(url, targetType) {
  // This is a placeholder as the full implementation would be extensive
  return {
    success: true,
    data: { selector: `div.${targetType}`, confidence: 0.9, sample: 'Sample Text' },
  }
}
