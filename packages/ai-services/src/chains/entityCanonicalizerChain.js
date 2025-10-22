// packages/ai-services/src/chains/entityCanonicalizerChain.js
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { RunnableSequence } from '@langchain/core/runnables'
import { instructionCanonicalizer } from '@headlines/prompts'
import { getUtilityModel } from '../lib/langchain.js'
import { safeInvoke } from '../lib/safeInvoke.js'
import { canonicalizerSchema } from '@headlines/models/schemas'
import { buildPrompt } from '../lib/promptBuilder.js'

const systemPrompt = buildPrompt(instructionCanonicalizer)

const prompt = ChatPromptTemplate.fromMessages([
  ['system', systemPrompt],
  ['human', '{entity_name}'],
])

const chain = RunnableSequence.from([prompt, getUtilityModel()])

export const entityCanonicalizerChain = {
  invoke: (input) =>
    safeInvoke(chain, input, 'entityCanonicalizerChain', canonicalizerSchema),
}
