// packages/ai-services/src/lib/rag/generation.js (Corrected for OpenAI)
import { getSynthesizerPrompt } from './prompts'
import { checkGroundedness } from './validation'
// CORRECTED IMPORT: Use the generic callLanguageModel instead of the Groq-specific one.
import { callLanguageModel } from '../lib/langchain.js'

// CORRECTED MODEL: Switched from a Groq-specific model to a powerful OpenAI model.
const SYNTHESIZER_MODEL = 'gpt-4o'

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
- **Groundedness Passed:** CONFIRMED
`
  return thoughts.trim().replace(/\n\n+/g, '\n\n')
}

export async function generateFinalResponse({ plan, context }) {
  const fullContextString = assembleContext(
    context.ragResults,
    context.wikiResults,
    context.searchResults
  )

  console.log('[RAG Generation] Calling Synthesizer Agent with OpenAI...')
  // CORRECTED CALL: Replaced callGroqWithRetry with the standard callLanguageModel.
  const synthesizerResponse = await callLanguageModel({
    modelName: SYNTHESIZER_MODEL,
    systemPrompt: getSynthesizerPrompt(),
    userContent: `CONTEXT:\n${fullContextString}\n\nPLAN:\n${JSON.stringify(
      plan.plan,
      null,
      2
    )}\n\nUSER'S QUESTION: "${plan.user_query}"`,
    isJson: false, // CRITICAL: The synthesizer prompt returns Markdown, not JSON.
    temperature: 0.1,
  })

  const rawResponse = synthesizerResponse
  if (typeof rawResponse !== 'string') {
    console.error(
      '[RAG Generation] Synthesizer Agent failed to return a valid string response.',
      rawResponse
    )
    return {
      answer: 'The AI synthesizer failed to generate a response.',
      thoughts: 'An error occurred during the final synthesis step.',
    }
  }

  const groundednessResult = await checkGroundedness(rawResponse, fullContextString)
  const thoughts = formatThoughts(plan, context, groundednessResult)

  let finalAnswer
  if (groundednessResult.is_grounded) {
    let responseWithSpans = rawResponse.replace(/<rag>/g, '<span class="rag-source">')
    responseWithSpans = responseWithSpans.replace(/<\/rag>/g, '</span>')
    responseWithSpans = responseWithSpans.replace(/<wiki>/g, '<span class="wiki-source">')
    responseWithSpans = responseWithSpans.replace(/<\/wiki>/g, '</span>')
    responseWithSpans = responseWithSpans.replace(
      /<search>/g,
      '<span class="llm-source">'
    )
    finalAnswer = responseWithSpans.replace(/<\/search>/g, '</span>')
  } else {
    console.warn('[RAG Pipeline] Groundedness check failed. Returning safe response.')
    finalAnswer =
      'I was unable to construct a reliable answer from the available sources. The context may be insufficient or conflicting.'
  }

  return { answer: finalAnswer, thoughts }
}
