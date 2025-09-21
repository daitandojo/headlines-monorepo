// apps/pipeline/src/config/dynamicConfig.js (version 3.2.0)
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Source, WatchlistEntity, Country } from '@headlines/models'
import { logger } from '@headlines/utils-server'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const configStore = {
  newspaperToCountryMap: new Map(),
  watchlistEntities: new Map(),
  activeCountries: new Set(),
  searchTermToEntityMap: new Map(),
}

async function loadConfigFromDB() {
  logger.info('Loading dynamic configuration from database...')
  Object.keys(configStore).forEach((key) => {
    const store = configStore[key]
    if (store instanceof Map || store instanceof Set) store.clear()
    if (Array.isArray(store)) store.length = 0
  })

  const [sources, watchlistItems, activeCountries] = await Promise.all([
    Source.find().lean(),
    WatchlistEntity.find({ status: 'active' }).lean(),
    Country.find({ status: 'active' }).select('name').lean(),
  ])

  for (const country of activeCountries) {
    configStore.activeCountries.add(country.name)
  }

  for (const source of sources) {
    configStore.newspaperToCountryMap.set(source.name, source.country)
  }

  for (const item of watchlistItems) {
    const nameKey = item.name.toLowerCase().trim()
    if (!configStore.watchlistEntities.has(nameKey)) {
      configStore.watchlistEntities.set(nameKey, item)
    }

    if (item.searchTerms && item.searchTerms.length > 0) {
      for (const term of item.searchTerms) {
        const termKey = term.toLowerCase().trim()
        if (!configStore.searchTermToEntityMap.has(termKey)) {
          configStore.searchTermToEntityMap.set(termKey, item)
        }
      }
    }
  }

  logger.info(
    `Dynamic config loaded:\n    - Sources: ${sources.length}\n    - Watchlist Items: ${configStore.watchlistEntities.size}\n    - Active Countries: ${configStore.activeCountries.size}\n    - Search Terms: ${configStore.searchTermToEntityMap.size}`
  )
}

export async function refreshConfig() {
  try {
    await loadConfigFromDB()
  } catch (error) {
    logger.error({ err: error }, 'Failed to refresh dynamic configuration from DB.')
  }
}
