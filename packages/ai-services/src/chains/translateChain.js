// packages/ai-services/src/chains/translateChain.js
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { RunnableSequence } from '@langchain/core/runnables'
import { instructionTranslate } from '@headlines/prompts'
import { getUtilityModel } from '../lib/langchain.js'
import { safeInvoke } from '../lib/safeInvoke.js'
import { translateSchema } from '@headlines/models/schemas'
import { buildPrompt } from '../lib/promptBuilder.js'

const systemPrompt = buildPrompt(instructionTranslate)

const prompt = ChatPromptTemplate.fromMessages([
  ['system', systemPrompt],
  ['human', 'Target Language: {language}\n\nHTML Content:\n```{html_content}```'],
])

const chain = RunnableSequence.from([prompt, getUtilityModel()])

export const translateChain = {
  invoke: (input) => safeInvoke(chain, input, 'translateChain', translateSchema),
}
