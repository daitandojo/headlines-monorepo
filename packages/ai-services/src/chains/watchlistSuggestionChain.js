// packages/ai-services/src/chains/watchlistSuggestionChain.js (version 2.3 - Final)
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { JsonOutputParser } from '@langchain/core/output_parsers'
import { RunnableSequence } from '@langchain/core/runnables'
import { instructionWatchlistSuggestion } from '@headlines/prompts'
import { getHighPowerModel } from '../lib/langchain.js'
import { safeInvoke } from '../lib/safeInvoke.js'
import { watchlistSuggestionSchema } from '../schemas/index.js'

const systemPrompt = [
  instructionWatchlistSuggestion.whoYouAre,
  instructionWatchlistSuggestion.whatYouDo,
  ...instructionWatchlistSuggestion.guidelines,
  instructionWatchlistSuggestion.outputFormatDescription,
  instructionWatchlistSuggestion.reiteration,
].join('\n\n')

const prompt = ChatPromptTemplate.fromMessages([
  ['system', systemPrompt],
  ['human', 'Events Data: {events_json_string}'],
])

// --- DEFINITIVE FIX ---
// The chain now ends with the model. The JsonOutputParser is removed.
const chain = RunnableSequence.from([prompt, getHighPowerModel()])

export const watchlistSuggestionChain = {
  invoke: (input) =>
    safeInvoke(chain, input, 'watchlistSuggestionChain', watchlistSuggestionSchema),
}
