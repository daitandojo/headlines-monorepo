// packages/ai-services/src/rag/generation.js
import { getSynthesizerPrompt } from './prompts.js'
import { checkGroundedness } from './validation.js'
import { callLanguageModel } from '../lib/langchain.js'
import { settings } from '@headlines/config'
import { ragResponseSchema } from '@headlines/models/schemas'
import { logger } from '@headlines/utils-shared'

const SYNTHESIZER_MODEL = settings.LLM_MODEL_SYNTHESIS

function assembleContext(ragResults, wikiResults, searchResults) {
  const dbContext =
    ragResults.length > 0
      ? ragResults
          .map(
            (match) =>
              `- [Similarity: ${match.score.toFixed(3)}] ${match.metadata.headline}: ${match.metadata.summary}`
          )
          .join('\n')
      : 'None'

  const wikiContext =
    wikiResults.length > 0
      ? wikiResults
          .map(
            (res) => `- [Quality: ${res.validation.quality}] ${res.title}: ${res.summary}`
          )
          .join('\n')
      : 'None'

  const searchContext =
    searchResults.length > 0
      ? searchResults
          .map((res) => `- [${res.title}](${res.link}): ${res.snippet}`)
          .join('\n')
      : 'None'

  return `---
Internal Database Context:
${dbContext}
---
Wikipedia Context:
${wikiContext}
---
Search Results Context:
${searchContext}
---`
}

function formatThoughts(plan, context, groundednessResult) {
  const thoughts = `
**THOUGHT PROCESS: THE PLAN**
${plan.plan.map((step) => `- ${step}`).join('\n')}

**REASONING:**
${plan.reasoning}

**RETRIEVED CONTEXT:**
- **Internal RAG Search:** ${context.ragResults.length} item(s) found.
${context.ragResults.map((r) => `  - [Score: ${r.score.toFixed(2)}] ${r.metadata.headline}`).join('\n')}

- **Wikipedia Search:** ${context.wikiResults.length} article(s) found.
${context.wikiResults.map((w) => `  - **Query:** "${w.query}"\n    - **Result:** ${w.title}: ${w.summary.substring(0, 100)}...`).join('\n')}

- **Web Search:** ${context.searchResults.length} result(s) found.
${context.searchResults.map((s) => `  - **Query:** "${plan.user_query}"\n    - **Result:** ${s.title}: ${s.snippet.substring(0, 100)}...`).join('\n')}

**FINAL CHECK:**
- **Groundedness Passed:** ${groundednessResult.is_grounded ? 'CONFIRMED' : 'FAILED'}
`
  return thoughts.trim().replace(/\n\n+/g, '\n\n')
}

function buildHtmlFromAnswerParts(answerParts) {
  if (!answerParts || answerParts.length === 0) return ''
  return answerParts
    .map((part) => {
      const sourceClass = {
        rag: 'rag-source',
        wiki: 'wiki-source',
        search: 'llm-source',
        llm: '',
      }[part.source]
      return sourceClass ? `<span class="${sourceClass}">${part.text}</span>` : part.text
    })
    .join('')
}

export async function generateFinalResponse({ plan, context }) {
  const fullContextString = assembleContext(
    context.ragResults,
    context.wikiResults,
    context.searchResults
  )

  logger.info(`[RAG Generation] Calling Synthesizer Agent with ${SYNTHESIZER_MODEL}...`)
  const synthesizerResponse = await callLanguageModel({
    modelName: SYNTHESIZER_MODEL,
    systemPrompt: getSynthesizerPrompt(),
    userContent: `CONTEXT:\n${fullContextString}\n\nPLAN:\n${JSON.stringify(
      plan.plan,
      null,
      2
    )}\n\nUSER'S QUESTION: "${plan.user_query}"`,
    isJson: true,
  })

  const validation = ragResponseSchema.safeParse(synthesizerResponse)
  if (!validation.success) {
    logger.error(
      { err: validation.error },
      '[RAG Generation] Synthesizer Agent failed to return valid structured JSON.'
    )
    return {
      answer: 'The AI synthesizer failed to generate a structured response.',
      thoughts: 'An error occurred during the final synthesis step.',
    }
  }

  const answerParts = validation.data.answer_parts
  const rawResponseText = answerParts.map((p) => p.text).join(' ')

  const groundednessResult = await checkGroundedness(rawResponseText, fullContextString)
  const thoughts = formatThoughts(plan, context, groundednessResult)

  let finalAnswer
  if (groundednessResult.is_grounded) {
    finalAnswer = buildHtmlFromAnswerParts(answerParts)
  } else {
    logger.warn('[RAG Pipeline] Groundedness check failed. Returning safe response.')
    finalAnswer =
      'I was unable to construct a reliable answer from the available sources. The context may be insufficient or conflicting.'
  }

  return { answer: finalAnswer, thoughts }
}
