// apps/client/src/lib/api-client.js
'use client'

import { toast } from 'sonner'

async function fetchApi(
  endpoint,
  { body, method = 'POST', headers = { 'Content-Type': 'application/json' } } = {}
) {
  try {
    const response = await fetch(endpoint, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    if (
      response.headers.get('content-type')?.includes('csv') ||
      response.headers.get('content-type')?.includes('application/vnd.ms-excel')
    ) {
      return response
    }

    const result = await response.json()
    if (!response.ok) {
      throw new Error(result.error || result.details || 'An unknown API error occurred.')
    }
    return result
  } catch (error) {
    console.error(`[api-client] Fetch failed for ${endpoint}:`, error.message)
    return { success: false, error: error.message }
  }
}

export const loginUser = async (email, password) => {
  const result = await fetchApi('/api/auth/login', { body: { email, password } })
  if (!result.success) {
    toast.error('Login Failed', { description: result.error })
  }
  return result
}

export const signupUser = async (signupData) => {
  const result = await fetchApi('/api/auth/signup', { body: signupData })
  if (!result.success) {
    toast.error('Signup Failed', { description: result.error })
  }
  return result
}

export const generateChatTitle = (messages) =>
  fetchApi('/api/chat/title', { body: { messages } })

export const savePushSubscription = (subscription) =>
  fetchApi('/api/push/subscribe', { body: subscription })

export const saveSubscription = savePushSubscription

export const updateUserInteraction = (interactionData) =>
  fetchApi('/api/user/interactions', { body: interactionData })

export const clearDiscardedItems = () =>
  fetchApi('/api/user/settings/clear-discarded', { method: 'POST' })

export const processUploadedArticle = (item) =>
  fetchApi('/api/upload-article', { body: { item } })

export const sendItemToEmail = (itemId, itemType) =>
  fetchApi('/api/email/send-item', { body: { itemId, itemType } })

export const linkOpportunityToEventClient = (eventId, opportunityId) =>
  fetchApi('/api-admin/relationships/link', { body: { eventId, opportunityId } })

export const unlinkOpportunityFromEventClient = (eventId, opportunityId) =>
  fetchApi('/api-admin/relationships/unlink', { body: { eventId, opportunityId } })

export async function handleExport(entity, fileType, filters, sort) {
  try {
    const response = await fetch('/api-admin/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity, fileType, filters, sort }),
    })

    if (!response.ok) {
      const errorResult = await response.json()
      throw new Error(errorResult.details || 'Export failed on the server.')
    }

    const blob = await response.blob()
    const contentDisposition = response.headers.get('content-disposition')
    let filename = 'export.dat'
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+?)"/)
      if (filenameMatch && filenameMatch.length === 2) filename = filenameMatch[1]
    }

    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)

    return { success: true }
  } catch (error) {
    toast.error('Export Failed', { description: error.message })
    return { success: false, error: error.message }
  }
}
