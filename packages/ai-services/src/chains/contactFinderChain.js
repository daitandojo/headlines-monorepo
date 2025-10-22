// packages/ai-services/src/chains/contactFinderChain.js
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { RunnableSequence } from '@langchain/core/runnables'
import { instructionContacts } from '@headlines/prompts'
import { getHighPowerModel } from '../lib/langchain.js'
import { safeInvoke } from '../lib/safeInvoke.js'
import { findContactSchema } from '@headlines/models/schemas'
import { buildPrompt } from '../lib/promptBuilder.js'

const systemPrompt = buildPrompt(instructionContacts)

const prompt = ChatPromptTemplate.fromMessages([
  ['system', systemPrompt],
  ['human', '{snippets}'],
])

const chain = RunnableSequence.from([prompt, getHighPowerModel()])

export const contactFinderChain = {
  invoke: (input) => safeInvoke(chain, input, 'contactFinderChain', findContactSchema),
}
