// packages/ai-services/src/chains/translateChain.js (version 1.0.0)
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { JsonOutputParser } from '@langchain/core/output_parsers'
import { RunnableSequence } from '@langchain/core/runnables'
import { instructionTranslate } from '@headlines/prompts'
import { getUtilityModel } from '../lib/langchain.js'
import { safeInvoke } from '../lib/safeInvoke.js'
import { translateSchema } from '../schemas/index.js'

const systemPrompt = [
  instructionTranslate.whoYouAre,
  instructionTranslate.whatYouDo,
  ...instructionTranslate.guidelines,
  instructionTranslate.outputFormatDescription,
  instructionTranslate.reiteration,
].join('\\n\\n')

const prompt = ChatPromptTemplate.fromMessages([
  ['system', systemPrompt],
  ['human', 'Target Language: {language}\\n\\nHTML Content:\\n```{html_content}```'],
])

const chain = RunnableSequence.from([prompt, getUtilityModel(), new JsonOutputParser()])

export const translateChain = {
  invoke: (input) =>
    safeInvoke(chain, input, 'translateChain', translateSchema),
}
