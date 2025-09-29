// packages/ai-services/src/chains/batchHeadlineChain.js (version 1.0)
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { JsonOutputParser } from '@langchain/core/output_parsers'
import { RunnableSequence } from '@langchain/core/runnables'
import { instructionBatchHeadlineAssessment } from '@headlines/prompts'
import { getHeadlineModel } from '../lib/langchain.js' // Use the specific model for headlines
import { safeInvoke } from '../lib/safeInvoke.js'
import { batchHeadlineAssessmentSchema } from '../schemas/index.js'

const systemPrompt = [
  instructionBatchHeadlineAssessment.whoYouAre,
  instructionBatchHeadlineAssessment.whatYouDo,
  instructionBatchHeadlineAssessment.primaryMandate,
  instructionBatchHeadlineAssessment.analyticalFramework,
  instructionBatchHeadlineAssessment.outputFormatDescription,
  instructionBatchHeadlineAssessment.reiteration,
].join('\n\n')

const prompt = ChatPromptTemplate.fromMessages([
  ['system', systemPrompt],
  ['human', '{headlines_json_string}'],
])

const chain = RunnableSequence.from([prompt, getHeadlineModel(), new JsonOutputParser()])

export const batchHeadlineChain = {
  invoke: (input) =>
    safeInvoke(chain, input, 'batchHeadlineChain', batchHeadlineAssessmentSchema),
}
