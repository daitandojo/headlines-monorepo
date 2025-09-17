// src/actions/aiSourceDiscovery.js (version 1.0)
'use server'

import { verifyAdmin } from '@/lib/adminAuth'
import { scrapeUrl } from './scrape'
import { callGroqWithRetry } from '@/lib/groq'
import {
  SECTION_SUGGESTER_PROMPT,
  SELECTOR_SUGGESTER_PROMPT,
} from '@/lib/prompts/sourceDiscoveryPrompts'

const AI_AGENT_MODEL = 'llama3-70b-8192'

/**
 * Action that takes a base URL, scrapes it, and asks an AI agent to suggest relevant news sections.
 */
export async function suggestSections(url) {
  const { isAdmin, error } = await verifyAdmin()
  if (!isAdmin) return { success: false, error }

  console.log(`[AI Source Discovery] Step 1: Suggesting sections for ${url}`)
  const scrapeResult = await scrapeUrl(url)
  if (!scrapeResult.success) {
    return scrapeResult
  }

  try {
    const response = await callGroqWithRetry({
      model: AI_AGENT_MODEL,
      messages: [
        { role: 'system', content: SECTION_SUGGESTER_PROMPT },
        {
          role: 'user',
          content: `Analyze the following HTML content from ${url} and suggest relevant news sections:\n\n---\n\n${scrapeResult.content.substring(0, 15000)}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.0,
    })

    const data = JSON.parse(response.choices[0].message.content)
    console.log(`[AI Source Discovery] Found ${data.suggestions.length} potential sections.`)
    return { success: true, data: data.suggestions }
  } catch (e) {
    console.error('[AI Source Discovery Error - suggestSections]:', e)
    return { success: false, error: 'AI agent failed to suggest sections.' }
  }
}

/**
 * Action that takes a URL and a target type (e.g., 'headlines'), scrapes it,
 * and asks an AI agent to suggest a robust CSS selector.
 */
export async function suggestSelector(url, targetType) {
  const { isAdmin, error } = await verifyAdmin()
  if (!isAdmin) return { success: false, error }

  console.log(`[AI Source Discovery] Step 2: Suggesting selector for ${targetType} on ${url}`)
  const scrapeResult = await scrapeUrl(url)
  if (!scrapeResult.success) {
    return scrapeResult
  }

  const prompt = SELECTOR_SUGGESTER_PROMPT.replace('{TARGET_TYPE}', targetType)

  try {
    const response = await callGroqWithRetry({
      model: AI_AGENT_MODEL,
      messages: [
        { role: 'system', content: prompt },
        {
          role: 'user',
          content: `Analyze the following HTML from ${url} to find a selector for the ${targetType}:\n\n---\n\n${scrapeResult.content.substring(0, 15000)}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.0,
    })

    const data = JSON.parse(response.choices[0].message.content)
    console.log(`[AI Source Discovery] Suggested selector with confidence ${data.confidence}: ${data.selector}`)
    return { success: true, data }
  } catch (e) {
    console.error('[AI Source Discovery Error - suggestSelector]:', e)
    return { success: false, error: `AI agent failed to suggest a selector for ${targetType}.` }
  }
}