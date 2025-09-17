// packages/ai-services/src/chains/synthesisChain.js (version 2.3 - Final)
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { JsonOutputParser } from '@langchain/core/output_parsers'
import { RunnableSequence } from '@langchain/core/runnables'
import { instructionSynthesize } from '../../../prompts/src/index.js'
import { getHighPowerModel } from '../lib/langchain.js'
import { safeInvoke } from '../lib/safeInvoke.js'
import { synthesisSchema } from '../schemas/index.js'

const systemPrompt = [
  instructionSynthesize.whoYouAre,
  instructionSynthesize.whatYouDo,
  ...instructionSynthesize.guidelines,
  instructionSynthesize.outputFormatDescription,
].join('\n\n')

const prompt = ChatPromptTemplate.fromMessages([
  ['system', systemPrompt],
  ['human', '{context_json_string}'],
])

const chain = RunnableSequence.from([prompt, getHighPowerModel(), new JsonOutputParser()])

export const synthesisChain = {
  invoke: (input) => safeInvoke(chain, input, 'synthesisChain', synthesisSchema),
}
