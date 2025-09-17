// packages/ai-services/src/chains/selectorRepairChain.js (version 2.3 - Final)
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { JsonOutputParser } from '@langchain/core/output_parsers'
import { RunnableSequence } from '@langchain/core/runnables'
import { instructionSelectorRepair } from '../../../prompts/src/index.js'
import { getUtilityModel } from '../lib/langchain.js'
import { safeInvoke } from '../lib/safeInvoke.js'
import { selectorRepairSchema } from '../schemas/index.js'

const systemPrompt = [
  instructionSelectorRepair.whoYouAre,
  instructionSelectorRepair.whatYouDo,
  ...instructionSelectorRepair.guidelines,
  instructionSelectorRepair.outputFormatDescription,
  instructionSelectorRepair.reiteration,
].join('\n\n')

const prompt = ChatPromptTemplate.fromMessages([
  ['system', systemPrompt],
  ['human', '{payload_json_string}'],
])

const chain = RunnableSequence.from([prompt, getUtilityModel(), new JsonOutputParser()])

export const selectorRepairChain = {
  invoke: (input) =>
    safeInvoke(chain, input, 'selectorRepairChain', selectorRepairSchema),
}
