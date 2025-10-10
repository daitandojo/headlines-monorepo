import { ChatPromptTemplate } from '@langchain/core/prompts'
import { JsonOutputParser } from '@langchain/core/output_parsers'
import { RunnableSequence } from '@langchain/core/runnables'
import { getInstructionOpportunities } from '@headlines/prompts'
import { getProModel } from '../lib/langchain.js'
import { safeInvoke } from '../lib/safeInvoke.js'
import { opportunitySchema } from '@headlines/models/schemas'
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

// --- DEFINITIVE FIX ---
// The chain now ends with the model. The JsonOutputParser is removed.
const chain = RunnableSequence.from([prompt, getProModel()])

export const opportunityChain = {
  invoke: (input) => safeInvoke(chain, input, 'opportunityChain', opportunitySchema),
}
