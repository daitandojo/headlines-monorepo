// packages/ai-services/src/chains/executiveSummaryChain.js (version 2.3 - Final)
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { JsonOutputParser } from '@langchain/core/output_parsers'
import { RunnableSequence } from '@langchain/core/runnables'
import { instructionExecutiveSummary } from '../../../prompts/src/index.js'
import { getHighPowerModel } from '../lib/langchain.js'
import { safeInvoke } from '../lib/safeInvoke.js'
import { executiveSummarySchema } from '../schemas/index.js'

const systemPrompt = [
  instructionExecutiveSummary.whoYouAre,
  instructionExecutiveSummary.whatYouDo,
  ...instructionExecutiveSummary.guidelines,
  instructionExecutiveSummary.outputFormatDescription,
  instructionExecutiveSummary.reiteration,
].join('\n\n')

const prompt = ChatPromptTemplate.fromMessages([
  ['system', systemPrompt],
  ['human', 'Run Data: {payload_json_string}'],
])

const chain = RunnableSequence.from([prompt, getHighPowerModel(), new JsonOutputParser()])

export const executiveSummaryChain = {
  invoke: (input) =>
    safeInvoke(chain, input, 'executiveSummaryChain', executiveSummarySchema),
}
