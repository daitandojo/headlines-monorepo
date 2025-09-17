// packages/ai-services/src/chains/contactResolverChain.js (version 2.3 - Final)
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { JsonOutputParser } from '@langchain/core/output_parsers'
import { RunnableSequence } from '@langchain/core/runnables'
import { instructionEnrichContact } from '../../../prompts/src/index.js'
import { getHighPowerModel } from '../lib/langchain.js'
import { safeInvoke } from '../lib/safeInvoke.js'
import { enrichContactSchema } from '../schemas/index.js'

const systemPrompt = [
  instructionEnrichContact.whoYouAre,
  instructionEnrichContact.whatYouDo,
  ...instructionEnrichContact.guidelines,
  instructionEnrichContact.outputFormatDescription,
].join('\n\n')

const prompt = ChatPromptTemplate.fromMessages([
  ['system', systemPrompt],
  ['human', '{context}'],
])

const chain = RunnableSequence.from([prompt, getHighPowerModel(), new JsonOutputParser()])

export const contactResolverChain = {
  invoke: (input) =>
    safeInvoke(chain, input, 'contactResolverChain', enrichContactSchema),
}
