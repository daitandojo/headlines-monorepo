// packages/ai-services/src/chains/synthesisChain.js
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { RunnableSequence } from '@langchain/core/runnables'
import { instructionSynthesize } from '@headlines/prompts'
import { getProModel } from '../lib/langchain.js'
import { safeInvoke } from '../lib/safeInvoke.js'
import { synthesisSchema } from '@headlines/models/schemas'
import { buildPrompt } from '../lib/promptBuilder.js'

const systemPrompt = buildPrompt(instructionSynthesize)

const prompt = ChatPromptTemplate.fromMessages([
  ['system', systemPrompt],
  ['human', '{context_json_string}'],
])

const chain = RunnableSequence.from([prompt, getProModel()])

export const synthesisChain = {
  invoke: (input) => safeInvoke(chain, input, 'synthesisChain', synthesisSchema),
}
