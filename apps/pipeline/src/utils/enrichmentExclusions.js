// apps/pipeline/src/utils/enrichmentExclusions.js
// Shared exclusion list for enrichment — skips costly Kimi K2 deep research
// for globally-famous individuals who are not wealth management targets.
// Exclusions are loaded from the Setting collection in MongoDB, with fallback defaults.

import { Setting } from '@headlines/models'
import { logger } from '@headlines/utils-shared'

const SETTING_KEY = 'ENRICHMENT_EXCLUSIONS'

const DEFAULT_EXCLUSIONS = [
  'elon musk', 'donald trump', 'sam altman', 'openai', 'anthropic',
  'jeff bezos', 'bill gates', 'mark zuckerberg', 'warren buffett',
  'larry page', 'sergey brin', 'tim cook', 'satya nadella',
]

let cachedExclusions = null
let lastFetch = 0
const CACHE_TTL = 5 * 60 * 1000

async function loadExclusions() {
  const now = Date.now()
  if (cachedExclusions && (now - lastFetch) < CACHE_TTL) {
    return cachedExclusions
  }
  try {
    const setting = await Setting.findOne({ key: SETTING_KEY }).lean()
    if (setting?.value && Array.isArray(setting.value)) {
      cachedExclusions = new Set(setting.value.map(s => s.toLowerCase().trim()).filter(Boolean))
    } else {
      cachedExclusions = new Set(DEFAULT_EXCLUSIONS)
    }
  } catch {
    cachedExclusions = new Set(DEFAULT_EXCLUSIONS)
  }
  lastFetch = Date.now()
  return cachedExclusions
}

export async function isExcluded(name) {
  if (!name) return false
  const exclusions = await loadExclusions()
  const lower = name.toLowerCase().trim()
  // Check exact match
  if (exclusions.has(lower)) return true
  // Check partial match (e.g. "Musk" matches "elon musk")
  for (const excluded of exclusions) {
    if (lower.includes(excluded) || excluded.includes(lower)) return true
  }
  return false
}

export async function getExclusionList() {
  await loadExclusions()
  return Array.from(cachedExclusions)
}

export async function addExclusion(name, runId) {
  const list = await getExclusionList()
  const lower = name.toLowerCase().trim()
  if (!lower || list.includes(lower)) return false
  list.push(lower)
  await Setting.updateOne(
    { key: SETTING_KEY },
    { $set: { value: list } },
    { upsert: true }
  )
  cachedExclusions = new Set(list)
  logger.info(`[Exclusions] Added "${lower}"`)
  return true
}

export async function removeExclusion(name) {
  const list = await getExclusionList()
  const lower = name.toLowerCase().trim()
  const filtered = list.filter(e => e !== lower)
  if (filtered.length === list.length) return false
  await Setting.updateOne(
    { key: SETTING_KEY },
    { $set: { value: filtered } }
  )
  cachedExclusions = new Set(filtered)
  logger.info(`[Exclusions] Removed "${lower}"`)
  return true
}