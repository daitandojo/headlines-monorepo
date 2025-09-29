// packages/ai-services/src/chains/synthesisChain.js (version 2.3 - Final)
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { JsonOutputParser } from '@langchain/core/output_parsers'
import { RunnableSequence } from '@langchain/core/runnables'
import { instructionSynthesize } from '@headlines/prompts'
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

// --- DEFINITIVE FIX ---
// The chain now ends with the model. The JsonOutputParser is removed.
const chain = RunnableSequence.from([prompt, getHighPowerModel()])

export const synthesisChain = {
  invoke: (input) => safeInvoke(chain, input, 'synthesisChain', synthesisSchema),
}
