// packages/ai-services/src/chains/emailIntroChain.js
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { RunnableSequence } from '@langchain/core/runnables'
import { instructionEmailIntro } from '@headlines/prompts'
import { getHighPowerModel } from '../lib/langchain.js'
import { safeInvoke } from '../lib/safeInvoke.js'
import { emailIntroSchema } from '@headlines/models/schemas'
import { buildPrompt } from '../lib/promptBuilder.js'

const systemPrompt = buildPrompt(instructionEmailIntro)

const prompt = ChatPromptTemplate.fromMessages([
  ['system', systemPrompt],
  ['human', 'Client and Event Data: {payload_json_string}'],
])

const chain = RunnableSequence.from([prompt, getHighPowerModel()])

export const emailIntroChain = {
  invoke: (input) => safeInvoke(chain, input, 'emailIntroChain', emailIntroSchema),
}
