// apps/client/src/lib/api-client.js (version 2.1.0)
'use client'

import { toast } from 'sonner'

async function fetchApi(endpoint, { body, method = 'POST' } = {}) {
  try {
    const response = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    const result = await response.json()
    if (!response.ok) {
      throw new Error(result.error || 'An unknown API error occurred.')
    }
    return result
  } catch (error) {
    toast.error('API Request Failed', { description: error.message })
    return { success: false, error: error.message }
  }
}

// CHAT
export async function generateChatTitle(messages) {
  return fetchApi('/api/chat/title', { body: { messages } })
}

// USER INTERACTIONS & SETTINGS
export async function updateUserInteraction(interactionData) {
  return fetchApi('/api/user/interactions', { body: interactionData })
}

export async function clearDiscardedItems() {
  return fetchApi('/api/user/settings/clear-discarded', {})
}

// PUSH SUBSCRIPTIONS
export async function savePushSubscription(subscription) {
  return fetchApi('/api/push/subscribe', { body: subscription })
}

// UPLOAD
export async function processUploadedArticle(item) {
  return fetchApi('/api/upload/process-article', { body: { item } })
}
