// packages/ai-services/src/chains/emailIntroChain.js (version 2.3 - Final)
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { JsonOutputParser } from '@langchain/core/output_parsers'
import { RunnableSequence } from '@langchain/core/runnables'
import { instructionEmailIntro } from '@headlines/prompts'
import { getHighPowerModel } from '../lib/langchain.js'
import { safeInvoke } from '../lib/safeInvoke.js'
import { emailIntroSchema } from '../schemas/index.js'

const systemPrompt = [
  instructionEmailIntro.whoYouAre,
  instructionEmailIntro.whatYouDo,
  ...instructionEmailIntro.guidelines,
  instructionEmailIntro.outputFormatDescription,
  instructionEmailIntro.reiteration,
].join('\n\n')

const prompt = ChatPromptTemplate.fromMessages([
  ['system', systemPrompt],
  ['human', 'Client and Event Data: {payload_json_string}'],
])

// --- DEFINITIVE FIX ---
// The chain now ends with the model. The JsonOutputParser is removed.
const chain = RunnableSequence.from([prompt, getHighPowerModel()])

export const emailIntroChain = {
  invoke: (input) => safeInvoke(chain, input, 'emailIntroChain', emailIntroSchema),
}
