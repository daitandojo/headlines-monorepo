// apps/pipeline/src/modules/monitoring/selectorHealer.js
// Smart selector healer: DOM heuristics first, LLM only as fallback
import * as cheerio from 'cheerio'
import fs from 'fs/promises'
import { logger } from '@headlines/utils-shared'
import { callLanguageModel } from '@headlines/ai-services'
import { healHeadlineSelectors, resetFailureCount } from '@headlines/scraper-logic/scraper/healSourceSelectors.js'
import { Source, HealingLog } from '@headlines/models'

const HEURISTIC_SCORE_THRESHOLD = 10
const MIN_MATCHES = 3
const LLM_COOLDOWN_MINUTES = 60
const HEURISTIC_COOLDOWN_MINUTES = 30
const lastAttemptMap = new Map()

// ─── PUBLIC API ─────────────────────────────────────────────

export async function attemptSelectorRepair(healthEntry, runId) {
  const sourceName = healthEntry.source
  if (!sourceName) return false

  const cooldownKey = `heuristic_${sourceName}`
  const lastHeuristic = lastAttemptMap.get(cooldownKey)
  if (lastHeuristic && (Date.now() - lastHeuristic) < HEURISTIC_COOLDOWN_MINUTES * 60 * 1000) {
    return false
  }
  lastAttemptMap.set(cooldownKey, Date.now())

  const htmlPath = healthEntry.debugHtml
  if (!htmlPath || typeof htmlPath !== 'string') {
    logger.warn(`[SelectorHealer] No debug HTML for "${sourceName}", skipping`)
    return false
  }

  let html
  try {
    html = await fs.readFile(htmlPath, 'utf-8')
  } catch {
    logger.warn(`[SelectorHealer] Cannot read debug HTML for "${sourceName}" at ${htmlPath}`)
    return false
  }

  const source = await Source.findOne({ name: sourceName }).lean()
  if (!source) {
    logger.warn(`[SelectorHealer] Source "${sourceName}" not found in DB`)
    return false
  }

  // Phase 1: DOM heuristics (free)
  logger.info(`[SelectorHealer] Phase 1: DOM heuristics for "${sourceName}"`)
  const heuristicResult = await heuristicHeadlineSearch(html, source)

  if (heuristicResult && heuristicResult.confidence >= HEURISTIC_SCORE_THRESHOLD) {
    logger.info(`[SelectorHealer] Heuristics found selectors for "${sourceName}" (score: ${heuristicResult.confidence})`)
    const saved = await saveHealedSelectors(source, heuristicResult, 'headline', 'heuristic', runId)
    return saved
  }

  // Phase 2: LLM fallback (paid, with cooldown)
  const llmCooldownKey = `llm_${sourceName}`
  const lastLLM = lastAttemptMap.get(llmCooldownKey)
  if (lastLLM && (Date.now() - lastLLM) < LLM_COOLDOWN_MINUTES * 60 * 1000) {
    logger.info(`[SelectorHealer] LLM cooldown active for "${sourceName}", skipping LLM phase`)
    return false
  }
  lastAttemptMap.set(llmCooldownKey, Date.now())

  logger.info(`[SelectorHealer] Phase 2: LLM repair for "${sourceName}"`)
  const selectors = await healHeadlineSelectors(source, html)
  if (!selectors) {
    logger.warn(`[SelectorHealer] LLM repair failed for "${sourceName}"`)
    return false
  }

  const saved = await saveHealedSelectors(source, selectors, 'headline', 'llm', runId)
  return saved
}

// ─── DOM HEURISTICS ─────────────────────────────────────────

async function heuristicHeadlineSearch(html, source) {
  const $ = cheerio.load(html)
  const candidates = []

  // Common article container class patterns
  const containerPatterns = [
    '[class*="article"]', '[class*="news"]', '[class*="post"]', '[class*="card"]',
    '[class*="item"]', '[class*="list"]', '[class*="grid"]', '[class*="story"]',
    '[class*="entry"]', '[class*="result"]', '[class*="teaser"]', '[class*="headline"]',
  ]

  // Strategy 1: Find repeating container children
  for (const pattern of containerPatterns) {
    const containers = $(pattern)
    for (const el of containers.slice(0, 10)) {
      const $el = $(el)
      const children = $el.children().toArray()
      if (children.length < MIN_MATCHES) continue

      // Detect repeating child structure
      const tagCounts = {}
      for (const child of children) {
        const tag = child.tagName || 'div'
        tagCounts[tag] = (tagCounts[tag] || 0) + 1
      }

      // Find the most common tag as the repeating unit
      let bestTag = 'div'
      let bestCount = 0
      for (const [tag, count] of Object.entries(tagCounts)) {
        if (count > bestCount) { bestCount = count; bestTag = tag }
      }
      if (bestCount < MIN_MATCHES) continue

      // Build selector for this repeating unit
      const parentPath = buildSelector($el)
      const unitSelector = `${parentPath} > ${bestTag}`

    try {
      const score = evaluateSelector($, unitSelector)
      if (score >= HEURISTIC_SCORE_THRESHOLD) {
        candidates.push({ selector: unitSelector, score, method: 'repeating_children' })
        if (score >= 15) break
      }
    } catch {
      // invalid selector, skip
    }
    }
    if (candidates.some(c => c.score >= 15)) break
  }

  // Strategy 2: Find repeating siblings (same class, same parent)
  const parentsWithRepeats = new Set()
  $('body > *, main > *, [class*="content"] > *, [class*="main"] > *').each((_, el) => {
    const $parent = $(el).parent()
    const parentKey = `${$parent.length ? buildSelector($parent) : 'body'}|${el.tagName}`
    if (parentsWithRepeats.has(parentKey)) return
    parentsWithRepeats.add(parentKey)

    const siblings = $parent.children(el.tagName).toArray()
    if (siblings.length < MIN_MATCHES) return

    // Check if siblings share a class
    const classCounts = {}
    for (const sibling of siblings) {
      const cls = $(sibling).attr('class') || ''
      const mainClass = cls.split(/\s+/)[0]
      if (mainClass) classCounts[mainClass] = (classCounts[mainClass] || 0) + 1
    }

    let bestClass = null
    let bestClassCount = 0
    for (const [cls, count] of Object.entries(classCounts)) {
      if (count > bestClassCount) { bestClass = cls; bestClassCount = count }
    }

    if (bestClassCount < MIN_MATCHES) return
    const unitSelector = `${buildSelector($parent)} > ${el.tagName}.${bestClass}`
    try {
      const score = evaluateSelector($, unitSelector)
      if (score >= HEURISTIC_SCORE_THRESHOLD) {
        candidates.push({ selector: unitSelector, score, method: 'repeating_siblings' })
      }
    } catch {
      // invalid selector, skip
    }
  })

  // Strategy 3: Direct heading search on common tags
  const headingSelectors = ['h1', 'h2', 'h3', 'a[class*="title"]', 'a[class*="headline"]', '[class*="title"] > a']
  for (const sel of headingSelectors) {
    const matches = $(sel)
    if (matches.length >= MIN_MATCHES) {
      const linkCount = matches.filter((_, el) => {
        const href = $(el).attr('href') || $(el).find('a').attr('href') || ''
        return href && !href.startsWith('#') && href.length > 5
      }).length
      if (linkCount >= MIN_MATCHES) {
        const score = 8 + Math.min(matches.length, 10)
        candidates.push({ selector: sel, score, method: 'direct_heading' })
      }
    }
  }

  // Pick best candidate
  candidates.sort((a, b) => b.score - a.score)
  const best = candidates[0]
  if (!best) return null

  // Generate link selector: try to find a link inside the headline element
  const headSelector = best.selector
  const sampleEl = $(headSelector).first()
  const linkEl = sampleEl.is('a') ? sampleEl : sampleEl.find('a').first()
  const linkSel = linkEl.length
    ? `${headSelector} a`
    : sampleEl.is('a') ? headSelector : null

  return {
    headlineSelector: [headSelector],
    linkSelector: linkSel,
    confidence: best.score,
    method: best.method,
  }
}

// ─── HELPERS ────────────────────────────────────────────────

function evaluateSelector($, selector) {
  let elements
  try {
    elements = $(selector)
  } catch {
    return 0
  }
  const count = elements.length
  if (count < MIN_MATCHES) return 0

  let textScore = 0
  let linkScore = 0

  elements.each((_, el) => {
    try {
      const $el = $(el)
      const text = $el.text().trim()
      const link = $el.is('a') ? $el.attr('href') : $el.find('a').first().attr('href')

      if (text.length >= 15 && text.length <= 200) textScore++
      else if (text.length > 5 && text.length <= 300) textScore += 0.5

      if (link && !link.startsWith('#') && link.length > 5) linkScore++
    } catch {
      // skip problematic elements
    }
  })

  const textRatio = count > 0 ? textScore / count : 0
  const linkRatio = count > 0 ? linkScore / count : 0
  const score = Math.min(count, 10) + (textRatio * 5) + (linkRatio * 5)
  return Math.round(score * 10) / 10
}

function buildSelector($el) {
  if (!$el || !$el.length) return ''

  const tag = ($el[0].tagName || '').toLowerCase() || 'div'
  const id = $el.attr('id')
  if (id) return `${tag}#${id.replace(/[^a-zA-Z0-9_-]/g, '')}`

  const cls = ($el.attr('class') || '').split(/\s+/).filter(Boolean)
  const meaningful = cls.filter(c => !c.startsWith('ng-') && !c.startsWith('_') && c.length > 1)
  const safeClasses = meaningful.map(c => c.replace(/[^a-zA-Z0-9_-]/g, '')).filter(Boolean)
  if (safeClasses.length > 0) return `${tag}.${safeClasses.slice(0, 2).join('.')}`

  return tag
}

// ─── PERSISTENCE ────────────────────────────────────────────

async function saveHealedSelectors(source, selectors, type, method, runId) {
  const isHeuristic = method === 'heuristic'
  const headlineSel = Array.isArray(selectors.headlineSelector)
    ? selectors.headlineSelector
    : [selectors.headlineSelector || '']

  const updateFields = {
    lastHealedAt: new Date(),
    ...(headlineSel[0] ? { headlineSelector: headlineSel } : {}),
    ...(selectors.linkSelector ? { linkSelector: selectors.linkSelector } : {}),
  }

  try {
    await Source.updateOne({ _id: source._id }, { $set: updateFields })
    await resetFailureCount(source._id)

    // Log to HealingLog
    const log = new HealingLog({
      runId,
      action: 'selector_repair',
      targetType: 'source',
      targetName: source.name,
      reason: `Selector repair via ${method} (confidence: ${selectors.confidence || 'N/A'})`,
      severity: isHeuristic ? 'low' : 'medium',
      before: { headlineSelector: source.headlineSelector, linkSelector: source.linkSelector },
      after: updateFields,
      success: true,
    })
    await log.save()

    logger.info(`[SelectorHealer] ${isHeuristic ? 'Heuristic' : 'LLM'} repair applied to "${source.name}": ${headlineSel[0]}`)
    return true
  } catch (err) {
    logger.error({ err: err.message }, `[SelectorHealer] Failed to save repaired selectors for "${source.name}"`)
    return false
  }
}