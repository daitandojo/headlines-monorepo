// packages/ai-services/src/chains/judgeChain.js
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { RunnableSequence } from '@langchain/core/runnables'
import { instructionJudge } from '@headlines/prompts'
import { getHighPowerModel } from '../lib/langchain.js'
import { safeInvoke } from '../lib/safeInvoke.js'
import { judgeSchema } from '@headlines/models/schemas'
import { buildPrompt } from '../lib/promptBuilder.js'

const systemPrompt = buildPrompt(instructionJudge)

const prompt = ChatPromptTemplate.fromMessages([
  ['system', systemPrompt],
  ['human', 'Data for review: {payload_json_string}'],
])

const chain = RunnableSequence.from([prompt, getHighPowerModel()])

export const judgeChain = {
  invoke: (input) => safeInvoke(chain, input, 'judgeChain', judgeSchema),
}
