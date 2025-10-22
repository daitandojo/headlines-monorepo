// packages/ai-services/src/chains/selectorRepairChain.js
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { RunnableSequence } from '@langchain/core/runnables'
import { instructionSelectorRepair } from '@headlines/prompts'
import { getUtilityModel } from '../lib/langchain.js'
import { safeInvoke } from '../lib/safeInvoke.js'
import { selectorRepairSchema } from '@headlines/models/schemas'
import { buildPrompt } from '../lib/promptBuilder.js'

const systemPrompt = buildPrompt(instructionSelectorRepair)

const prompt = ChatPromptTemplate.fromMessages([
  ['system', systemPrompt],
  ['human', '{payload_json_string}'],
])

const chain = RunnableSequence.from([prompt, getUtilityModel()])

export const selectorRepairChain = {
  invoke: (input) =>
    safeInvoke(chain, input, 'selectorRepairChain', selectorRepairSchema),
}
