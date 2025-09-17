// packages/ai-services/src/chains/disambiguationChain.js (version 2.3 - Final)
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { JsonOutputParser } from '@langchain/core/output_parsers'
import { RunnableSequence } from '@langchain/core/runnables'
import { instructionDisambiguation } from '../../../prompts/src/index.js'
import { getUtilityModel } from '../lib/langchain.js'
import { safeInvoke } from '../lib/safeInvoke.js'
import { disambiguationSchema } from '../schemas/index.js'

const systemPrompt = [
  instructionDisambiguation.whoYouAre,
  instructionDisambiguation.whatYouDo,
  ...instructionDisambiguation.guidelines,
  instructionDisambiguation.outputFormatDescription,
].join('\n\n')

const prompt = ChatPromptTemplate.fromMessages([
  ['system', systemPrompt],
  ['human', '{inputText}'],
])

const chain = RunnableSequence.from([prompt, getUtilityModel(), new JsonOutputParser()])

export const disambiguationChain = {
  invoke: (input) =>
    safeInvoke(chain, input, 'disambiguationChain', disambiguationSchema),
}
