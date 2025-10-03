// apps/pipeline/scripts/seed/seed-countries.js
import { logger } from '@headlines/utils-shared'
import { initializeScriptEnv } from './lib/script-init.js'
import { updateCountry } from '@headlines/data-access'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function loadCountriesFromFile() {
  const filePath = path.resolve(
    __dirname,
    '../../../../packages/utils-shared/src/data/countries.json'
  )
  const fileContent = fs.readFileSync(filePath, 'utf8')
  const countryData = JSON.parse(fileContent)
  return Object.entries(countryData).map(([name, isoCode]) => ({ name, isoCode }))
}

async function seedCountries() {
  await initializeScriptEnv()
  logger.info('🚀 Seeding Countries from canonical JSON file...')
  const countriesToSeed = loadCountriesFromFile()
  try {
    const promises = countriesToSeed.map((country) =>
      updateCountry(
        { name: country.name },
        {
          $set: { isoCode: country.isoCode.substring(0, 2) },
          $setOnInsert: { name: country.name, status: 'active' },
        },
        { upsert: true }
      )
    )

    // Note: A true bulk upsert function would be more efficient.
    // This is a simple implementation for seeding.
    await Promise.all(promises)

    logger.info(
      `✅ Country seeding complete. Synced ${countriesToSeed.length} countries.`
    )
  } catch (error) {
    logger.fatal({ err: error }, '❌ Country seeding failed.')
  }
}

seedCountries()
