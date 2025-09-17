// packages/ai-services/src/chains/judgeChain.js (version 2.3 - Final)
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { JsonOutputParser } from '@langchain/core/output_parsers'
import { RunnableSequence } from '@langchain/core/runnables'
import { instructionJudge } from '../../../prompts/src/index.js'
import { getHighPowerModel } from '../lib/langchain.js'
import { safeInvoke } from '../lib/safeInvoke.js'
import { judgeSchema } from '../schemas/index.js'

const systemPrompt = [
  instructionJudge.whoYouAre,
  instructionJudge.whatYouDo,
  ...instructionJudge.guidelines,
  instructionJudge.outputFormatDescription,
  instructionJudge.reiteration,
].join('\n\n')

const prompt = ChatPromptTemplate.fromMessages([
  ['system', systemPrompt],
  ['human', 'Data for review: {payload_json_string}'],
])

const chain = RunnableSequence.from([prompt, getHighPowerModel(), new JsonOutputParser()])

export const judgeChain = {
  invoke: (input) => safeInvoke(chain, input, 'judgeChain', judgeSchema),
}
