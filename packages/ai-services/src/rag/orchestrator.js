// packages/ai-services/src/rag/orchestrator.js
import { retrieveContextForQuery } from './retrieval.js'
import { assessContextQuality } from './validation.js'
import { generateFinalResponse } from './generation.js'
import { runPlannerAgent } from './planner.js'
import { logger } from '@headlines/utils-shared'

export async function processChatRequest(messages) {
  logger.info('--- [RAG Pipeline Start] ---')

  logger.info('[RAG Pipeline] Step 1: Planning Phase Started...')
  const plan = await runPlannerAgent(messages)
  logger.info('[RAG Pipeline] Step 1: Planning Phase Completed.')

  logger.info('[RAG Pipeline] Step 2: Retrieval Phase Started...')
  const initialContext = await retrieveContextForQuery(plan, messages, 'ragOnly')
  const initialQuality = assessContextQuality(initialContext.ragResults, [], [])

  let finalContext = initialContext

  if (initialQuality.hasHighConfidenceRAG) {
    logger.info(
      '[RAG Pipeline] High confidence RAG hit found. Short-circuiting retrieval.'
    )
  } else {
    logger.info('[RAG Pipeline] RAG context insufficient. Proceeding to full retrieval.')
    finalContext = await retrieveContextForQuery(plan, messages, 'full')
  }
  logger.info('[RAG Pipeline] Step 2: Retrieval Phase Completed.')

  logger.info('[RAG Pipeline] Step 3: Synthesis Phase Started...')
  const finalResponse = await generateFinalResponse({
    plan,
    context: finalContext,
  })
  logger.info('[RAG Pipeline] Step 3: Synthesis Phase Completed.')

  logger.info('--- [RAG Pipeline End] ---')
  return finalResponse
}
