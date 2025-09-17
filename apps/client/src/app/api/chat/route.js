// src/app/api/chat/route.js (version 6.1)
import { processChatRequest } from '@/lib/rag/orchestrator'
import { logQuery, startTimer } from '@/lib/monitoring'

// This API route is now NON-STREAMING to ensure response accuracy.
// It prioritizes correctness over low-latency streaming.

export async function POST(req) {
  const overallTimer = await startTimer('overall_request')
  let queryForLogging = 'unknown'

  try {
    const { messages } = await req.json()
    queryForLogging = messages[messages.length - 1].content

    // Delegate all complex logic to the RAG orchestrator.
    // This now returns a structured object with the answer and thoughts.
    const response = await processChatRequest(messages)

    // Return the response as a JSON payload.
    return Response.json(response)
  } catch (error) {
    console.error('[CHAT API Top-Level Error]', error)

    const responseTime = await overallTimer.end({ error: true })

    // Log the failed query
    await logQuery({
      query: queryForLogging,
      responseTime,
      confidenceLevel: 'error',
      error: error.message,
    })

    const errorMessage =
      'An error occurred while processing your request. Please check the server logs for details.'
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500 })
  }
}

  