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
  instructionCluster.reiteration,
].join('\n\n')

const prompt = ChatPromptTemplate.fromMessages([
  ['system', systemPrompt],
  ['human', '{articles_json_string}'],
])

const chain = RunnableSequence.from([prompt, getHighPowerModel(), new JsonOutputParser()])

export const clusteringChain = {
  invoke: (input) => safeInvoke(chain, input, 'clusteringChain', clusterSchema),
}
