// packages/ai-services/src/chains/contactFinderChain.js (version 2.3 - Final)
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { JsonOutputParser } from '@langchain/core/output_parsers'
import { RunnableSequence } from '@langchain/core/runnables'
import { instructionContacts } from '@headlines/prompts'
import { getHighPowerModel } from '../lib/langchain.js'
import { safeInvoke } from '../lib/safeInvoke.js'
import { findContactSchema } from '../schemas/index.js'

const systemPrompt = [
  instructionContacts.whoYouAre,
  instructionContacts.whatYouDo,
  ...instructionContacts.guidelines,
  instructionContacts.outputFormatDescription,
].join('\n\n')

const prompt = ChatPromptTemplate.fromMessages([
  ['system', systemPrompt],
  ['human', '{snippets}'],
])

// --- DEFINITIVE FIX ---
// The chain now ends with the model. The JsonOutputParser is removed.
const chain = RunnableSequence.from([prompt, getHighPowerModel()])

export const contactFinderChain = {
  invoke: (input) => safeInvoke(chain, input, 'contactFinderChain', findContactSchema),
}
