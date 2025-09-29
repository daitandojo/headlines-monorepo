import { ChatPromptTemplate } from '@langchain/core/prompts'
import { JsonOutputParser } from '@langchain/core/output_parsers'
import { RunnableSequence } from '@langchain/core/runnables'
import { getInstructionOpportunities } from '@headlines/prompts'
import { getHighPowerModel } from '../lib/langchain.js'
import { safeInvoke } from '../lib/safeInvoke.js'
import { opportunitySchema } from '../schemas/index.js'
// Correct: Import from the /node entry point for the pipeline/Node.js environment
import { settings } from '@headlines/config/node'

const instructions = getInstructionOpportunities(settings)
const systemPrompt = [
  instructions.whoYouAre,
  instructions.whatYouDo,
  ...instructions.guidelines,
  instructions.outputFormatDescription,
].join('\n\n')

const prompt = ChatPromptTemplate.fromMessages([
  ['system', systemPrompt],
  ['human', '{context_text}'],
])

const chain = RunnableSequence.from([prompt, getHighPowerModel(), new JsonOutputParser()])

export const opportunityChain = {
  invoke: (input) => safeInvoke(chain, input, 'opportunityChain', opportunitySchema),
}
