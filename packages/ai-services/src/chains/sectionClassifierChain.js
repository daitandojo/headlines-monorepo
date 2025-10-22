// packages/ai-services/src/chains/sectionClassifierChain.js
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { RunnableSequence } from '@langchain/core/runnables'
import { getUtilityModel } from '../lib/langchain.js'
import { safeInvoke } from '../lib/safeInvoke.js'
import { sectionClassifierSchema } from '@headlines/models/schemas'
import { buildPrompt } from '../lib/promptBuilder.js'
import { instructionSectionClassifier } from '@headlines/prompts'

const systemPrompt = buildPrompt(instructionSectionClassifier)

const prompt = ChatPromptTemplate.fromMessages([
  ['system', systemPrompt],
  ['human', '{links_json_string}'],
])

const chain = RunnableSequence.from([prompt, getUtilityModel()])

export const sectionClassifierChain = {
  invoke: (input) =>
    safeInvoke(chain, input, 'sectionClassifierChain', sectionClassifierSchema),
}
