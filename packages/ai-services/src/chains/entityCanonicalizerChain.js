// packages/ai-services/src/chains/entityCanonicalizerChain.js (version 2.3 - Final)
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { JsonOutputParser } from '@langchain/core/output_parsers'
import { RunnableSequence } from '@langchain/core/runnables'
import { instructionCanonicalizer } from '../../../prompts/src/index.js'
import { getUtilityModel } from '../lib/langchain.js'
import { safeInvoke } from '../lib/safeInvoke.js'
import { canonicalizerSchema } from '../schemas/index.js'

const systemPrompt = [
  instructionCanonicalizer.whoYouAre,
  instructionCanonicalizer.whatYouDo,
  ...instructionCanonicalizer.guidelines,
  instructionCanonicalizer.outputFormatDescription,
].join('\n\n')

const prompt = ChatPromptTemplate.fromMessages([
  ['system', systemPrompt],
  ['human', '{entity_name}'],
])

const chain = RunnableSequence.from([prompt, getUtilityModel(), new JsonOutputParser()])

export const entityCanonicalizerChain = {
  invoke: (input) =>
    safeInvoke(chain, input, 'entityCanonicalizerChain', canonicalizerSchema),
}
