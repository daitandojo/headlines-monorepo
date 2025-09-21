// apps/client/src/app/api/chat/route.js (Refactored)
import { processChatRequest } from '@headlines/ai-services';

// This API route is now a lightweight wrapper.
// All heavy logic is correctly encapsulated in the @headlines/ai-services package.
export async function POST(req) {
  try {
    const { messages } = await req.json();
    // Delegate all complex logic to the shared service.
    const response = await processChatRequest(messages);
    return Response.json(response);
  } catch (error) {
    console.error('[CHAT API Top-Level Error]', error);
    const errorMessage = 'An error occurred while processing your request.';
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}
