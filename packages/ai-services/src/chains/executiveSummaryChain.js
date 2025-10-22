// packages/ai-services/src/chains/executiveSummaryChain.js
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { RunnableSequence } from '@langchain/core/runnables'
import { instructionExecutiveSummary } from '@headlines/prompts'
import { getHighPowerModel } from '../lib/langchain.js'
import { safeInvoke } from '../lib/safeInvoke.js'
import { executiveSummarySchema } from '@headlines/models/schemas'
import { buildPrompt } from '../lib/promptBuilder.js'

const systemPrompt = buildPrompt(instructionExecutiveSummary)

const prompt = ChatPromptTemplate.fromMessages([
  ['system', systemPrompt],
  ['human', 'Run Data: {payload_json_string}'],
])

const chain = RunnableSequence.from([prompt, getHighPowerModel()])

export const executiveSummaryChain = {
  invoke: (input) =>
    safeInvoke(chain, input, 'executiveSummaryChain', executiveSummarySchema),
}
