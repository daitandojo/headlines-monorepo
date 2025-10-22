// apps/pipeline/src/pipeline/1_preflight.js
import { logger } from '@headlines/utils-shared'
import { configure as configureScraperLogic } from '@headlines/scraper-logic/config.js'
import { env, populateSettings, settings } from '@headlines/config'
import { refreshConfig, configStore } from '../config/dynamicConfig.js'
import dbConnect from '@headlines/data-access/dbConnect/node'
import { deleteAllSince } from '@headlines/data-access'
import * as aiServices from '@headlines/ai-services'
import { performDatabaseHousekeeping } from '../utils/housekeeping.js'
import { configurePush } from '@headlines/scraper-logic/push/client.js'
import { configurePusher } from '@headlines/utils-server'
import { testRedisConnection } from '@headlines/utils-server'
import { Setting, Source } from '@headlines/models' // ADDED Source model
import * as allPrompts from '@headlines/prompts'

function validatePromptBraces(promptText, promptName) {
  const singleBraceRegex = /(?<!\{)\{(?!\{)|(?<!\})\}(?!\})/g
  const match = singleBraceRegex.exec(promptText)
  if (match) {
    const char = match[0]
    const index = match.index
    const contextSnippet = promptText.substring(
      Math.max(0, index - 30),
      Math.min(promptText.length, index + 30)
    )
    const errorMessage = `\n[PROMPT VALIDATION PRE-FLIGHT CHECK FAILED] for prompt '${promptName}'.\nFound a single unpaired curly brace '${char}' at position ${index}.\nAll curly braces in instruction prompts must be doubled (e.g., '{{' and '}}') to be treated as literal text and avoid template errors.\n\nContext:\n..."${contextSnippet}"...\n         ^\n`
    throw new Error(errorMessage)
  }
}

function validateAllPrompts() {
  logger.info('🔬 Performing prompt syntax validation pre-flight check...')
  function findAndValidateStrings(obj, name) {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        validatePromptBraces(obj[key], `${name}.${key}`)
      } else if (Array.isArray(obj[key])) {
        obj[key].forEach((item, index) => {
          if (typeof item === 'string') {
            validatePromptBraces(item, `${name}.${key}[${index}]`)
          } else if (typeof item === 'object' && item !== null) {
            findAndValidateStrings(item, `${name}.${key}[${index}]`)
          }
        })
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        findAndValidateStrings(obj[key], `${name}.${key}`)
      }
    }
  }
  for (const [promptName, promptObject] of Object.entries(allPrompts)) {
    if (promptName.startsWith('shots')) {
      logger.trace(`Skipping brace validation for few-shot example file: ${promptName}`)
      continue
    }
    if (promptObject && typeof promptObject === 'object') {
      const content =
        typeof promptObject === 'function' ? promptObject(settings) : promptObject
      findAndValidateStrings(content, promptName)
    }
  }
  logger.info('✅ All prompts passed syntax validation.')
}

export async function runPreFlightChecks(pipelinePayload) {
  logger.info('--- STAGE 1: PRE-FLIGHT CHECKS & SETUP ---')
  await dbConnect()
  pipelinePayload.dbConnection = true

  if (pipelinePayload.deleteToday) {
    logger.warn('--- DELETE TODAY MODE ENABLED ---')
    const cutoff = new Date()
    cutoff.setUTCHours(0, 0, 0, 0)
    await deleteAllSince(cutoff)
  }

  try {
    const dbSettings = await Setting.find({}).lean()
    populateSettings(dbSettings)
  } catch (error) {
    logger.fatal(
      { err: error },
      'CRITICAL: Failed to load settings from database. Halting.'
    )
    throw error
  }

  validateAllPrompts()
  await refreshConfig()
  configurePush()
  configurePusher()
  if (!(await testRedisConnection(env))) {
    logger.fatal('Redis pre-flight check failed. Aborting pipeline.')
    return { success: false }
  }

  const utilityFunctions = {
    findAlternativeSources: aiServices.findAlternativeSources,
    findNewsApiArticlesForEvent: aiServices.findNewsApiArticlesForEvent,
    performGoogleSearch: aiServices.performGoogleSearch,
    fetchWikipediaSummary: aiServices.fetchWikipediaSummary,
  }
  configureScraperLogic({
    ...env,
    paths: pipelinePayload.paths,
    configStore,
    utilityFunctions,
    logger,
    settings,
  })

  if (!(await aiServices.performAiSanityCheck(settings))) {
    logger.fatal('AI service checks failed. Aborting pipeline.')
    return { success: false }
  }

  await performDatabaseHousekeeping()

  // --- START OF MODIFICATION ---
  logger.info('Validating source filters and fetching sources to scrape...')
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const baseQuery = {
    status: 'active',
    $or: [
      { scrapeFrequency: 'high' },
      { scrapeFrequency: 'low', lastScrapedAt: { $lt: twentyFourHoursAgo } },
      { scrapeFrequency: 'low', lastScrapedAt: { $exists: false } },
    ],
  }
  const queryCriteria = { ...baseQuery }

  if (pipelinePayload.countryFilter) {
    queryCriteria.country = new RegExp(`^${pipelinePayload.countryFilter}$`, 'i')
    delete queryCriteria.$or
  }
  if (pipelinePayload.sourceFilter) {
    // Use a case-insensitive regex for the filter
    queryCriteria.name = new RegExp(`^${pipelinePayload.sourceFilter}$`, 'i')
    delete queryCriteria.$or
  }

  const sourcesToScrape = await Source.find(queryCriteria).lean()

  // If a specific filter was provided but no sources were found, it's a fatal error.
  if (
    sourcesToScrape.length === 0 &&
    (pipelinePayload.countryFilter || pipelinePayload.sourceFilter)
  ) {
    const filterKey = pipelinePayload.sourceFilter ? 'source' : 'country'
    const filterValue = pipelinePayload.sourceFilter || pipelinePayload.countryFilter
    const errorMessage = `PRE-FLIGHT FAILED: The specified filter (--${filterKey} "${filterValue}") matched 0 active sources. Halting run. Please check for typos.`
    logger.fatal(errorMessage)
    throw new Error(errorMessage)
  }

  logger.info(
    `Pre-flight check passed. Found ${sourcesToScrape.length} sources to process.`
  )
  pipelinePayload.sourcesToScrape = sourcesToScrape
  // --- END OF MODIFICATION ---

  return { success: true, payload: pipelinePayload }
}
