// src/actions/chat.js
'use server'

import OpenAI from 'openai'
import { env } from '@/lib/env.mjs' // <-- Import the validated env object

// Lazily initialize to create the client only when first needed.
let groq
function getGroqClient() {
  if (!groq) {
    // No more parsing here! Just use the pre-validated key.
    groq = new OpenAI({
      apiKey: env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    })
  }
  return groq
}

const TITLE_GENERATOR_MODEL = 'llama3-8b-8192'

const TITLE_GENERATOR_PROMPT = `You are a title generation AI. Your task is to read a conversation and create a concise, 5-word-or-less title that accurately summarizes the main topic.
- Be direct and factual.
- Do not use quotes or introductory phrases.
- The title should be in the same language as the conversation.

Example Conversation:
"user: Who is Anders Holch Povlsen?
assistant: Anders Holch Povlsen is a Danish billionaire, the CEO and sole owner of the international fashion retailer Bestseller."

Example Title:
"Anders Holch Povlsen's Bestseller"`

export async function generateChatTitle(messages) {
  if (!messages || messages.length < 2) {
    return { success: false, error: 'Not enough messages to generate a title.' }
  }

  try {
    const client = getGroqClient()
    console.log('[Chat Title] Generating title for conversation...')
    const conversationText = messages.map((m) => `${m.role}: ${m.content}`).join('\n')

    const response = await client.chat.completions.create({
      model: TITLE_GENERATOR_MODEL,
      messages: [
        { role: 'system', content: TITLE_GENERATOR_PROMPT },
        { role: 'user', content: conversationText },
      ],
      temperature: 0.1,
    })

    const title = response.choices[0].message.content.trim().replace(/"/g, '')
    console.log(`[Chat Title] Successfully generated title: "${title}"`)
    return { success: true, title }
  } catch (error) {
    console.error('[Chat Title Generation Error]', error)
    return { success: false, error: 'Failed to generate title.' }
  }
}
