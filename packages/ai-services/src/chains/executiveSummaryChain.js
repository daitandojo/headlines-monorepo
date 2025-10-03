// packages/ai-services/src/chains/executiveSummaryChain.js (version 2.3 - Final)
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { JsonOutputParser } from '@langchain/core/output_parsers'
import { RunnableSequence } from '@langchain/core/runnables'
import { instructionExecutiveSummary } from '@headlines/prompts'
import { getHighPowerModel } from '../lib/langchain.js'
import { safeInvoke } from '../lib/safeInvoke.js'
import { executiveSummarySchema } from '@headlines/models/schemas'

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

// --- DEFINITIVE FIX ---
// The chain now ends with the model. The JsonOutputParser is removed.
// The safeInvoke function will be responsible for all parsing.
const chain = RunnableSequence.from([prompt, getHighPowerModel()])

export const executiveSummaryChain = {
  invoke: (input) =>
    safeInvoke(chain, input, 'executiveSummaryChain', executiveSummarySchema),
}
