// packages/ai-services/src/chains/entityExtractorChain.js
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { RunnableSequence } from '@langchain/core/runnables'
import { instructionEntity } from '@headlines/prompts'
import { getUtilityModel } from '../lib/langchain.js'
import { safeInvoke } from '../lib/safeInvoke.js'
import { entitySchema } from '@headlines/models/schemas'
import { buildPrompt } from '../lib/promptBuilder.js'

const systemPrompt = buildPrompt(instructionEntity)

const prompt = ChatPromptTemplate.fromMessages([
  ['system', systemPrompt],
  ['human', '{article_text}'],
])

const chain = RunnableSequence.from([prompt, getUtilityModel()])

export const entityExtractorChain = {
  invoke: (input) => safeInvoke(chain, input, 'entityExtractorChain', entitySchema),
}
