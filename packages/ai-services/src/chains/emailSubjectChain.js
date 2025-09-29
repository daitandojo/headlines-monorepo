// packages/ai-services/src/chains/emailSubjectChain.js (version 2.3 - Final)
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { JsonOutputParser } from '@langchain/core/output_parsers'
import { RunnableSequence } from '@langchain/core/runnables'
import { instructionEmailSubject } from '@headlines/prompts'
import { getHighPowerModel } from '../lib/langchain.js'
import { safeInvoke } from '../lib/safeInvoke.js'
import { emailSubjectSchema } from '../schemas/index.js'

const systemPrompt = [
  instructionEmailSubject.whoYouAre,
  instructionEmailSubject.whatYouDo,
  ...instructionEmailSubject.guidelines,
  instructionEmailSubject.outputFormatDescription,
  instructionEmailSubject.reiteration,
].join('\n\n')

const prompt = ChatPromptTemplate.fromMessages([
  ['system', systemPrompt],
  ['human', 'Events Data: {events_json_string}'],
])

// --- DEFINITIVE FIX ---
// The chain now ends with the model. The JsonOutputParser is removed.
const chain = RunnableSequence.from([prompt, getHighPowerModel()])

export const emailSubjectChain = {
  invoke: (input) => safeInvoke(chain, input, 'emailSubjectChain', emailSubjectSchema),
}
