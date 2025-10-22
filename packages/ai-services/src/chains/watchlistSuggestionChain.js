// packages/ai-services/src/chains/watchlistSuggestionChain.js
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { RunnableSequence } from '@langchain/core/runnables'
import { instructionWatchlistSuggestion } from '@headlines/prompts'
import { getHighPowerModel } from '../lib/langchain.js'
import { safeInvoke } from '../lib/safeInvoke.js'
import { watchlistSuggestionSchema } from '@headlines/models/schemas'
import { buildPrompt } from '../lib/promptBuilder.js'

const systemPrompt = buildPrompt(instructionWatchlistSuggestion)

const prompt = ChatPromptTemplate.fromMessages([
  ['system', systemPrompt],
  ['human', 'Events Data: {events_json_string}'],
])

const chain = RunnableSequence.from([prompt, getHighPowerModel()])

export const watchlistSuggestionChain = {
  invoke: (input) =>
    safeInvoke(chain, input, 'watchlistSuggestionChain', watchlistSuggestionSchema),
}
