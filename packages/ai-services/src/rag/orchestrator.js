'use server';

// src/lib/rag/orchestrator.js (version 4.2)
import { retrieveContextForQuery } from './retrieval.js'
import { assessContextQuality } from './validation.js'
import { generateFinalResponse } from './generation.js'
import { runPlannerAgent } from './planner.js'

/**
 * Main orchestrator for the Agentic RAG chat pipeline.
 * @param {Array<object>} messages - The chat messages from the client.
 * @returns {Promise<string>} The final, validated text response.
 */
export async function processChatRequest(messages) {
  console.log('--- [RAG Pipeline Start] ---')

  // 1. Planning Phase
  console.log('[RAG Pipeline] Step 1: Planning Phase Started...')
  const plan = await runPlannerAgent(messages)
  console.log('[RAG Pipeline] Step 1: Planning Phase Completed.')

  // 2. Retrieval & Validation Phase
  console.log('[RAG Pipeline] Step 2: Retrieval Phase Started...')
  const initialContext = await retrieveContextForQuery(plan, messages, 'ragOnly')
  const initialQuality = assessContextQuality(initialContext.ragResults, [], [])

  let finalContext = initialContext

  if (initialQuality.hasHighConfidenceRAG) {
    console.log('[RAG Pipeline] High confidence RAG hit. Short-circuiting retrieval.')
  } else {
    console.log('[RAG Pipeline] RAG context insufficient. Proceeding to full retrieval.')
    // Perform the remaining retrieval steps
    finalContext = await retrieveContextForQuery(plan, messages, 'full')
  }
  console.log('[RAG Pipeline] Step 2: Retrieval Phase Completed.')

  // 3. Synthesis Phase
  console.log('[RAG Pipeline] Step 3: Synthesis Phase Started...')
  const finalResponse = await generateFinalResponse({
    plan,
    context: finalContext,
  })
  console.log('[RAG Pipeline] Step 3: Synthesis Phase Completed.')

  console.log('--- [RAG Pipeline End] ---')
  return finalResponse
}
