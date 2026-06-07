// apps/pipeline/src/modules/profilePhotoFinder.js
// Uses Kimi K2 web search to find actual profile photos for UHNW individuals
import { logger } from '@headlines/utils-shared'
import { callKimiModel, isKimiConfigured } from '@headlines/ai-services'
import { downloadProfilePhoto } from '../utils/imageDownloader.js'

export async function findAndCacheProfilePhoto(opportunityId, personName, company) {
  if (!personName || !isKimiConfigured()) return null

  try {
    const result = await callKimiModel({
      systemPrompt: 'You are a research assistant. Search the web for this person\'s profile photo. Return JSON: { photo_url (string or null), source (string), confidence (string: "high"/"medium"/"low") }. If no official photo found, try: Wikipedia, company team page, LinkedIn, news articles with images. Prefer recent professional headshots.',
      userContent: `Find a real profile photo of ${personName}${company ? ` who works at ${company}` : ''}. Search for their official headshot, LinkedIn photo, or Wikipedia image. Return null only if you cannot find any valid photo URL after thorough search.`,
      isJson: true,
      maxToolRounds: 8,
    })

    if (result?.photo_url) {
      const cached = await downloadProfilePhoto(result.photo_url, opportunityId)
      if (cached) {
        logger.info(`[ProfilePhoto] Cached photo for ${personName}: ${result.confidence} confidence`)
        return cached
      }
    }
  } catch (err) {
    logger.warn({ err: err.message }, `[ProfilePhoto] Kimi search failed for ${personName}`)
  }
  return null
}

export async function findAndCacheProfilePhotoSimple(personName, company) {
  if (!personName || !isKimiConfigured()) return null
  // Version without opportunityId — returns URL to download
  try {
    const result = await callKimiModel({
      systemPrompt: 'Search the web for a professional profile photo of this person. Return JSON with photo_url (string or null). Try Wikipedia images, news article images, company team pages.',
      userContent: `Find a real profile photo for: ${personName}${company ? ` (${company})` : ''}`,
      isJson: true,
      maxToolRounds: 6,
    })
    if (result?.photo_url) return result.photo_url
  } catch {}
  return null
}