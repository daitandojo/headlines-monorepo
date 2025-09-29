// apps/admin/src/lib/api-client.js (version 2.2.0)
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
      throw new Error(result.error || result.details || 'An unknown API error occurred.')
    }
    return result
  } catch (error) {
    toast.error('API Request Failed', { description: error.message })
    return { success: false, error: error.message }
  }
}

// SUBSCRIBERS (USERS)
export const createSubscriber = (data) => fetchApi('/api/subscribers', { body: data })
export const updateSubscriber = (id, data) =>
  fetchApi(`/api/subscribers/${id}`, { body: data, method: 'PATCH' })
export const deleteSubscriber = (id) =>
  fetchApi(`/api/subscribers/${id}`, { method: 'DELETE' })

// COUNTRIES
export const createCountry = (data) => fetchApi('/api/countries', { body: data })
export const updateCountry = (id, data) =>
  fetchApi(`/api/countries/${id}`, { body: data, method: 'PATCH' })

// SOURCES
export const createSource = (data) => fetchApi('/api/sources', { body: data })
export const updateSource = (id, data) =>
  fetchApi(`/api/sources/${id}`, { body: data, method: 'PATCH' })
export const testSourceConfigClient = (sourceConfig) =>
  fetchApi('/api/scrape/test-config', { body: sourceConfig })

// WATCHLIST
export const createWatchlistEntity = (data) => fetchApi('/api/watchlist', { body: data })
export const updateWatchlistEntity = (id, data) =>
  fetchApi(`/api/watchlist/${id}`, { body: data, method: 'PATCH' })
export const deleteWatchlistEntity = (id) =>
  fetchApi(`/api/watchlist/${id}`, { method: 'DELETE' })

// SUGGESTIONS
export const processSuggestion = (suggestionId, suggestionType, action) =>
  fetchApi('/api/suggestions', { body: { suggestionId, suggestionType, action } })
export const updateWatchlistSuggestion = (id, data) =>
  fetchApi(`/api/watchlist/suggestions/${id}`, { body: data, method: 'PATCH' })

// SETTINGS
export const getSettings = () => fetchApi('/api/settings', { method: 'GET' })
export const updateSettings = (data) =>
  fetchApi('/api/settings', { body: data, method: 'PATCH' })

// ARTICLES, EVENTS, OPPORTUNITIES (CRUD for inline editing)
export const updateAdminArticle = (id, data) =>
  fetchApi(`/api/articles/${id}`, { body: data, method: 'PATCH' })
export const deleteAdminArticle = (id) =>
  fetchApi(`/api/articles/${id}`, { method: 'DELETE' })
export const updateAdminEvent = (id, data) =>
  fetchApi(`/api/events/${id}`, { body: data, method: 'PATCH' })
export const deleteAdminEvent = (id) =>
  fetchApi(`/api/events/${id}`, { method: 'DELETE' })
export const updateAdminOpportunity = (id, data) =>
  fetchApi(`/api/opportunities/${id}`, { body: data, method: 'PATCH' })
export const deleteAdminOpportunity = (id) =>
  fetchApi(`/api/opportunities/${id}`, { method: 'DELETE' })

// RELATIONSHIPS
export const linkOpportunityToEventClient = (eventId, opportunityId) =>
  fetchApi('/api/relationships/link', { body: { eventId, opportunityId } })
export const unlinkOpportunityFromEventClient = (eventId, opportunityId) =>
  fetchApi('/api/relationships/unlink', { body: { eventId, opportunityId } })

// --- EXPORT ACTIONS ---
export async function handleExport(entity, fileType, filters, sort) {
  try {
    const response = await fetch('/api/export', {
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
      if (filenameMatch.length === 2) filename = filenameMatch[1]
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
