// packages/ai-services/src/chains/clusteringChain.js (version 3.2 - Final)
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { JsonOutputParser } from '@langchain/core/output_parsers'
import { RunnableSequence } from '@langchain/core/runnables'
import { instructionCluster } from '@headlines/prompts'
import { getHighPowerModel } from '../lib/langchain.js'
import { safeInvoke } from '../lib/safeInvoke.js'
import { clusterSchema } from '../schemas/index.js'

const systemPrompt = [
  instructionCluster.whoYouAre,
  instructionCluster.whatYouDo,
  ...instructionCluster.guidelines,
  instructionCluster.outputFormatDescription,
].join('\n\n')

const prompt = ChatPromptTemplate.fromMessages([
  ['system', systemPrompt],
  ['human', '{articles_json_string}'],
])

// --- DEFINITIVE FIX ---
// The chain now ends with the model. The JsonOutputParser is removed.
const chain = RunnableSequence.from([prompt, getHighPowerModel()])

export const clusteringChain = {
  invoke: (input) => safeInvoke(chain, input, 'clusteringChain', clusterSchema),
}
