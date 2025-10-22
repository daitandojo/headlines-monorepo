// packages/ai-services/src/chains/contactResolverChain.js
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { RunnableSequence } from '@langchain/core/runnables'
import { instructionEnrichContact } from '@headlines/prompts'
import { getHighPowerModel } from '../lib/langchain.js'
import { safeInvoke } from '../lib/safeInvoke.js'
import { enrichContactSchema } from '@headlines/models/schemas'
import { buildPrompt } from '../lib/promptBuilder.js'

const systemPrompt = buildPrompt(instructionEnrichContact)

const prompt = ChatPromptTemplate.fromMessages([
  ['system', systemPrompt],
  ['human', '{context}'],
])

const chain = RunnableSequence.from([prompt, getHighPowerModel()])

export const contactResolverChain = {
  invoke: (input) =>
    safeInvoke(chain, input, 'contactResolverChain', enrichContactSchema),
}
