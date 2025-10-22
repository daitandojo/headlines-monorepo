// packages/ai-services/src/chains/outreachDraftChain.js
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { RunnableSequence } from '@langchain/core/runnables'
import { instructionOutreachDraft } from '@headlines/prompts'
import { getProModel } from '../lib/langchain.js'
import { safeInvoke } from '../lib/safeInvoke.js'
import { z } from 'zod'
import { buildPrompt } from '../lib/promptBuilder.js'

// Define the Zod schema for validation
const outreachDraftSchema = z.object({
  subject: z.string().min(1, 'Subject line cannot be empty.'),
  body: z.string().min(1, 'Email body cannot be empty.'),
})

const systemPrompt = buildPrompt(instructionOutreachDraft)

const prompt = ChatPromptTemplate.fromMessages([
  ['system', systemPrompt],
  ['human', 'Intelligence Dossier (JSON):\n```{opportunity_json_string}```'],
])

const chain = RunnableSequence.from([prompt, getProModel()])

export const outreachDraftChain = {
  invoke: (input) => safeInvoke(chain, input, 'outreachDraftChain', outreachDraftSchema),
}
