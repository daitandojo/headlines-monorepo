// apps/client/src/app/api/chat/route.js
import { processChatRequest } from '@headlines/ai-services/next'
import { chatSchema } from '@headlines/models/schemas'
import { sendErrorAlert } from '@headlines/utils-server/next'

export async function POST(req) {
  try {
    const body = await req.json()
    const validation = chatSchema.safeParse(body)
    if (!validation.success) {
      return new Response(
        JSON.stringify({
          error: 'Invalid chat message structure.',
          details: validation.error.flatten(),
        }),
        { status: 400 }
      )
    }

    const response = await processChatRequest(validation.data.messages)
    return Response.json(response)
  } catch (error) {
    sendErrorAlert(error, { origin: 'CHAT_API_ROUTE' })
    const errorMessage = 'An error occurred while processing your request.'
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500 })
  }
}
