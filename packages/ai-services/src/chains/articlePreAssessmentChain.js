// packages/ai-services/src/chains/articlePreAssessmentChain.js (version 2.3 - Final)
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { JsonOutputParser } from '@langchain/core/output_parsers'
import { RunnableSequence } from '@langchain/core/runnables'
import { instructionArticlePreAssessment } from '../../../prompts/src/index.js'
import { getUtilityModel } from '../lib/langchain.js'
import { safeInvoke } from '../lib/safeInvoke.js'
import { articlePreAssessmentSchema } from '../schemas/index.js'

const systemPrompt = [
  instructionArticlePreAssessment.whoYouAre,
  instructionArticlePreAssessment.whatYouDo,
  instructionArticlePreAssessment.classificationFramework,
  instructionArticlePreAssessment.outputFormatDescription,
  instructionArticlePreAssessment.reiteration,
].join('\n\n')

const prompt = ChatPromptTemplate.fromMessages([
  ['system', systemPrompt],
  ['human', '{input}'],
])

const chain = RunnableSequence.from([prompt, getUtilityModel(), new JsonOutputParser()])

export const articlePreAssessmentChain = {
  invoke: (input) =>
    safeInvoke(chain, input, 'articlePreAssessmentChain', articlePreAssessmentSchema),
}
