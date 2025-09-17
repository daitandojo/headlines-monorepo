// src/lib/groq.js (version 1.0)
'use server'

import OpenAI from 'openai'
import { env } from '@/lib/env.mjs'

let groq
function getGroqClient() {
  if (!groq) {
    groq = new OpenAI({
      apiKey: env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    })
  }
  return groq
}

const MAX_RETRIES = 3
const INITIAL_DELAY_MS = 2000

/**
 * A resilient wrapper for Groq's chat completion API that implements
 * exponential backoff for transient server errors.
 * @param {object} params - The parameters for the chat completion request.
 * @returns {Promise<object>} The successful response from the Groq API.
 * @throws {Error} If the request fails after all retries or for a non-retryable reason.
 */
export async function callGroqWithRetry(params) {
  const client = getGroqClient()
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[Groq Client] Attempt ${attempt}: Calling chat completions API...`)
      const response = await client.chat.completions.create(params)
      console.log(`[Groq Client] Attempt ${attempt}: Call successful.`)
      return response
    } catch (error) {
      console.error(`[Groq Client] Attempt ${attempt} failed:`, {
        status: error.status,
        type: error.type,
        message: error.message,
      })

      // Only retry on specific transient error codes (5xx errors)
      const isRetryable = error.status >= 500 && error.status < 600
      if (!isRetryable || attempt === MAX_RETRIES) {
        console.error(
          `[Groq Client] Non-retryable error or final attempt failed. Rethrowing.`
        )
        throw error // Rethrow the original error
      }

      const delay = INITIAL_DELAY_MS * Math.pow(2, attempt - 1)
      console.log(`[Groq Client] Retrying in ${delay}ms...`)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
  // This line should theoretically not be reached, but is a safeguard.
  throw new Error('Groq API call failed after all retries.')
}
