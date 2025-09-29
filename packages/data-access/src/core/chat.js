// packages/data-access/src/actions/chat.js (version 2.0.0)
import { callLanguageModel } from '@headlines/ai-services'
import { settings } from '@headlines/config'

const TITLE_GENERATOR_MODEL = settings.LLM_MODEL_UTILITY

const TITLE_GENERATOR_PROMPT = `You are a title generation AI. Your task is to read a conversation and create a concise, 5-word-or-less title that accurately summarizes the main topic. Example Title: "Anders Holch Povlsen's Bestseller"`

export async function generateChatTitle(messages) {
  if (!messages || messages.length < 2) {
    return { success: false, error: 'Not enough messages to generate a title.' }
  }
  try {
    const conversationText = messages.map((m) => `${m.role}: ${m.content}`).join('\n')
    const title = await callLanguageModel({
      modelName: TITLE_GENERATOR_MODEL,
      systemPrompt: TITLE_GENERATOR_PROMPT,
      userContent: conversationText,
      isJson: false,
    })
    const cleanedTitle = title.trim().replace(/"/g, '')
    return { success: true, title: cleanedTitle }
  } catch (error) {
    return { success: false, error: 'Failed to generate title.' }
  }
}
