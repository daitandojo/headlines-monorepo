// packages/ai-services/src/chains/disambiguationChain.js
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { RunnableSequence } from '@langchain/core/runnables'
import { instructionDisambiguation } from '@headlines/prompts'
import { getUtilityModel } from '../lib/langchain.js'
import { safeInvoke } from '../lib/safeInvoke.js'
import { disambiguationSchema } from '@headlines/models/schemas'
import { buildPrompt } from '../lib/promptBuilder.js'

// The robust buildPrompt helper handles the construction of the system prompt,
// preventing errors if any properties on the instruction object are not iterable.
const systemPrompt = buildPrompt(instructionDisambiguation)

const prompt = ChatPromptTemplate.fromMessages([
  ['system', systemPrompt],
  ['human', '{inputText}'],
])

const chain = RunnableSequence.from([prompt, getUtilityModel()])

export const disambiguationChain = {
  invoke: (input) =>
    safeInvoke(chain, input, 'disambiguationChain', disambiguationSchema),
}
