// packages/ai-services/src/chains/entityExtractorChain.js (version 2.3 - Final)
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { JsonOutputParser } from '@langchain/core/output_parsers'
import { RunnableSequence } from '@langchain/core/runnables'
import { instructionEntity } from '@headlines/prompts'
import { getUtilityModel } from '../lib/langchain.js'
import { safeInvoke } from '../lib/safeInvoke.js'
import { entitySchema } from '@headlines/models/schemas'

const systemPrompt = [
  instructionEntity.whoYouAre,
  instructionEntity.whatYouDo,
  ...instructionEntity.guidelines,
  instructionEntity.outputFormatDescription,
].join('\n\n')

const prompt = ChatPromptTemplate.fromMessages([
  ['system', systemPrompt],
  ['human', '{article_text}'],
])

// --- DEFINITIVE FIX ---
// The chain now ends with the model. The JsonOutputParser is removed.
const chain = RunnableSequence.from([prompt, getUtilityModel()])

export const entityExtractorChain = {
  invoke: (input) => safeInvoke(chain, input, 'entityExtractorChain', entitySchema),
}
