// packages/ai-services/src/node/agents/sectionClassifierAgent.js
import { logger } from '@headlines/utils-shared'
import { AIAgent } from '../../lib/AIAgent.js'
import { sectionClassifierSchema } from '@headlines/models/schemas'
import { settings } from '@headlines/config/node'
import { instructionSectionClassifier } from '@headlines/prompts'

const getAgent = () =>
  new AIAgent({
    model: settings.LLM_MODEL_UTILITY, // Using the cheap and fast model
    systemPrompt: [
      instructionSectionClassifier.whoYouAre,
      instructionSectionClassifier.whatYouDo,
      ...instructionSectionClassifier.guidelines,
      instructionSectionClassifier.outputFormatDescription,
    ].join('\n\n'),
    zodSchema: sectionClassifierSchema,
  })

export async function classifyLinks(links) {
  if (!links || links.length === 0) {
    return []
  }

  const agent = getAgent() // <-- FIX APPLIED HERE
  const response = await agent.execute(JSON.stringify(links))

  if (
    response.error ||
    !response.classifications ||
    response.classifications.length !== links.length
  ) {
    logger.error(
      { response, expectedCount: links.length },
      'Section classifier agent failed or returned mismatched count.'
    )
    return null // Return null to indicate failure
  }

  return response.classifications
}
