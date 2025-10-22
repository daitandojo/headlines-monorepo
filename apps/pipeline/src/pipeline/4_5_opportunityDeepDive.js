// packages/pipeline/src/pipeline/4_5_opportunityDeepDive.js
import { logger } from '@headlines/utils-shared'
import { auditLogger } from '@headlines/utils-server'
import {
  performGoogleSearch,
  fetchWikipediaSummary,
  opportunityChain,
  dossierUpdateChain,
  callLanguageModel,
} from '@headlines/ai-services'
import { Opportunity, EntityGraph } from '@headlines/models'
import { settings } from '@headlines/config'
import { getConfig } from '@headlines/scraper-logic/config.js'
import pLimit from 'p-limit'
import colors from 'ansi-colors'

const CONCURRENCY_LIMIT = 2
const GOOGLE_SEARCH_RESULTS = 3
const CONTEXT_SECTION_SEPARATOR = '\n\n---'

function isValidIndividual(individual) {
  return individual && individual.name && typeof individual.name === 'string'
}

function generateSearchQueries(individual) {
  const queries = [`"${individual.name}"`]
  if (individual.company) {
    queries.push(`"${individual.name}" ${individual.company}`)
  }
  return queries
}

function buildEventContext(event) {
  return `Event Context: ${event.synthesized_headline}\n${event.synthesized_summary}`
}

function appendGoogleContext(context, googleResult) {
  if (googleResult.status === 'fulfilled' && googleResult.value?.success) {
    return `${context}${CONTEXT_SECTION_SEPARATOR} Google Search Snippets ---\n${googleResult.value.snippets}`
  }
  return context
}

function appendWikipediaContext(context, wikiResult) {
  if (wikiResult.status === 'fulfilled' && wikiResult.value?.success) {
    return `${context}${CONTEXT_SECTION_SEPARATOR} Wikipedia Summary: ${wikiResult.value.title} ---\n${wikiResult.value.summary}`
  }
  return context
}

function createFallbackResult(individual, event, errorMessage) {
  return {
    individual,
    event,
    combinedContext: buildEventContext(event),
    error: errorMessage,
  }
}

async function researchIndividual(individual, event) {
  try {
    if (!isValidIndividual(individual)) {
      throw new Error('Invalid individual object: missing or invalid name')
    }
    const config = getConfig()
    let combinedContext = buildEventContext(event)
    const queries = generateSearchQueries(individual)
    const [googleResult, wikiResult] = await Promise.allSettled([
      config.utilityFunctions.performGoogleSearch(queries[0], {
        numResults: GOOGLE_SEARCH_RESULTS,
      }),
      config.utilityFunctions.fetchWikipediaSummary(individual.name),
    ])
    combinedContext = appendGoogleContext(combinedContext, googleResult)
    combinedContext = appendWikipediaContext(combinedContext, wikiResult)
    return { individual, event, combinedContext, error: null }
  } catch (error) {
    logger.error(
      { err: error, individualName: individual?.name },
      '[Deep Dive] Research failed for individual'
    )
    return createFallbackResult(individual, event, error.message)
  }
}

function buildSummarizationPrompt(name) {
  return `You are an intelligence analyst. Read the following raw text about "${name}" and synthesize it into a concise, fact-based brief of NO MORE THAN 250 WORDS. Focus ONLY on career history, wealth, investments, company ownership, and key relationships. Discard all irrelevant noise. The output will be used to generate a structured dossier.`
}

async function summarizeContextForDossier(context, name) {
  const startTime = Date.now()
  logger.info(
    `[Deep Dive] Summarizing ${context.length} chars of raw context for ${name}...`
  )

  const prompt = buildSummarizationPrompt(name)

  auditLogger.info(
    {
      context: {
        agent: 'ContextSummarizer',
        model: settings.LLM_MODEL_SYNTHESIS,
        target: name,
        payload: { systemPrompt: prompt, userContent: context },
      },
    },
    `Pre-flight log for summarization call`
  )

  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Summarization timeout')), 20000)
    )

    const summaryPromise = callLanguageModel({
      modelName: settings.LLM_MODEL_SYNTHESIS,
      systemPrompt: prompt,
      userContent: context,
      isJson: false,
    })

    const summary = await Promise.race([summaryPromise, timeoutPromise])

    if (summary.error) {
      logger.warn(
        `[Deep Dive] Context summarization failed for ${name}. Using raw text as fallback.`
      )
      return context
    }

    logger.info(`[Deep Dive] Context summarized to ${summary.length} chars.`)
    return summary
  } catch (error) {
    logger.warn(
      { err: error, duration: Date.now() - startTime },
      `[Deep Dive] Summarization timeout or error for ${name}. Using raw text as fallback.`
    )
    return context
  }
}

// THIS FUNCTION IS NO LONGER NEEDED AND WILL BE REMOVED.
// function extractUniqueIndividuals(events) { ... }

function isValidResearchResult(result) {
  return (
    result &&
    typeof result === 'object' &&
    result.individual &&
    result.event &&
    result.combinedContext !== undefined
  )
}

function createResearchTasks(individualsMap, concurrencyLimit) {
  const limit = pLimit(concurrencyLimit)
  return Array.from(individualsMap.values()).map(({ individual, event }) =>
    limit(() => researchIndividual(individual, event))
  )
}

function buildOpportunityInput(summarizedContext) {
  return {
    context_text: summarizedContext,
    existing_wealth_profile: null,
  }
}

function extractLinkedOpportunity(result, eventKey) {
  if (!result.opportunities || result.opportunities.length === 0) return null
  const opportunity = result.opportunities[0]
  opportunity.event_key = eventKey
  return opportunity
}

async function synthesizeOpportunity(researchResult) {
  const { individual, event, combinedContext, error: researchError } = researchResult
  if (researchError) return null

  try {
    const summarizedContext = await summarizeContextForDossier(
      combinedContext,
      individual.name
    )
    const opportunityInput = buildOpportunityInput(summarizedContext)
    logger.info(
      `[Deep Dive] 🧬 Synthesizing rich opportunity profile for ${individual.name}...`
    )
    const result = await opportunityChain(opportunityInput)
    const opportunity = extractLinkedOpportunity(result, event.event_key)
    if (opportunity) {
      logger.info(
        `[Deep Dive]   - ✅ Successfully generated rich profile for ${individual.name}`
      )
      return opportunity
    } else {
      logger.warn(
        `[Deep Dive]   - ⚠️ Failed to generate a rich profile for ${individual.name}. AI Result: ${JSON.stringify(
          result
        )}`
      )
      return null
    }
  } catch (error) {
    logger.error(
      { err: error, individual: individual.name },
      '[Deep Dive] Synthesis failed for individual'
    )
    return null
  }
}

async function processResearchResults(researchResults) {
  const opportunities = []
  for (const researchResult of researchResults) {
    if (!isValidResearchResult(researchResult)) {
      logger.warn('[Deep Dive] A research task returned an invalid result; skipping')
      continue
    }
    const opportunity = await synthesizeOpportunity(researchResult)
    if (opportunity) {
      opportunities.push(opportunity)
    }
  }
  return opportunities
}

function deduplicateOpportunities(opportunities) {
  const opportunityMap = new Map()
  for (const opportunity of opportunities) {
    if (opportunity.reachOutTo) {
      const key = opportunity.reachOutTo.toLowerCase()
      opportunityMap.set(key, opportunity)
    }
  }
  return Array.from(opportunityMap.values())
}

function mergeOpportunities(existingOpportunities, newOpportunities) {
  const allOpportunities = [...(existingOpportunities || []), ...newOpportunities]
  return deduplicateOpportunities(allOpportunities)
}

function hasEventsToProcess(payload) {
  return payload.synthesizedEvents && payload.synthesizedEvents.length > 0
}

export async function runOpportunityDeepDive(pipelinePayload) {
  logger.info('--- STAGE 4.5: OPPORTUNITY DEEP DIVE (with Knowledge Graph) ---')
  // --- START OF DEFINITIVE FIX ---
  // Read the pre-vetted targets from Stage 3.5 instead of re-extracting.
  const { synthesizedEvents, opportunitiesToSave, highPotentialTargets } = pipelinePayload

  if (!hasEventsToProcess(pipelinePayload)) {
    logger.info('[Deep Dive] No new events to process. Skipping deep dive.')
    return { success: true, payload: pipelinePayload }
  }

  // Use the highPotentialTargets from the previous stage as the source of truth.
  if (!highPotentialTargets || highPotentialTargets.size === 0) {
    logger.info(
      '[Deep Dive] No new high-potential individuals identified by Entity Resolution. Skipping.'
    )
    return { success: true, payload: pipelinePayload }
  }

  // Convert the Set of names into the Map structure needed for research tasks.
  const individualsToResearch = new Map()
  for (const name of highPotentialTargets) {
    // Find the first event that mentions this individual to provide context.
    const relevantEvent = synthesizedEvents.find((e) =>
      (e.key_individuals || []).some((i) => i.name.toLowerCase() === name.toLowerCase())
    )
    if (relevantEvent) {
      const individualObject = relevantEvent.key_individuals.find(
        (i) => i.name.toLowerCase() === name.toLowerCase()
      )
      individualsToResearch.set(name.toLowerCase(), {
        individual: individualObject,
        event: relevantEvent,
      })
    }
  }

  if (individualsToResearch.size === 0) {
    logger.info('[Deep Dive] Could not match high-potential targets to events. Skipping.')
    return { success: true, payload: pipelinePayload }
  }
  // --- END OF DEFINITIVE FIX ---

  logger.info(
    `[Deep Dive] Identified ${individualsToResearch.size} unique, high-potential individuals for deep dive research.`
  )
  const researchTasks = createResearchTasks(individualsToResearch, CONCURRENCY_LIMIT)
  const researchResults = await Promise.all(researchTasks)
  const deepDiveOpportunities = await processResearchResults(researchResults)
  const finalOpportunities = mergeOpportunities(
    opportunitiesToSave,
    deepDiveOpportunities
  )
  pipelinePayload.opportunitiesToSave = finalOpportunities
  logger.info(
    `[Deep Dive] Stage complete. Total opportunities to commit: ${finalOpportunities.length}`
  )
  return { success: true, payload: pipelinePayload }
}
