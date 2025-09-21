// apps/pipeline/scripts/seed/lib/richlist-data-loader.js
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Opportunity } from '../../../../../packages/models/src/index.js'
import { logger } from '../../../../../packages/utils-server'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const BASE_PATH = path.resolve(__dirname, '../../')

const cityToCountryMap = {
  Sveits: 'Switzerland',
  USA: 'United States',
  Kypros: 'Cyprus',
  Storbritannia: 'United Kingdom',
  Belgia: 'Belgium',
  Danmark: 'Denmark',
  Brasil: 'Brazil',
  Italia: 'Italy',
  Monaco: 'Monaco',
  Portugal: 'Portugal',
  Spania: 'Spain',
  Singapore: 'Singapore',
  Østerrike: 'Austria',
}

function getCountry(city) {
  return cityToCountryMap[city] || 'Norway'
}

function parseWealth(wealthStr) {
  if (!wealthStr || typeof wealthStr !== 'string') return 0
  const match = wealthStr.match(/([\d,]+)\s*mrd/)
  if (!match) return 0
  const cleaned = match[1].replace(/,/g, '.')
  const value = parseFloat(cleaned)
  return Math.round(value * 94)
}

export async function loadAndPrepareRichlist() {
  const jsonPath = path.join(BASE_PATH, 'seed/data/norway.json')
  const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
  const allIndividuals = jsonData.individuals
  logger.info(
    `Loaded ${allIndividuals.length} total individuals from ${path.basename(jsonPath)}.`
  )

  const existingOppNames = (await Opportunity.find({}).select('reachOutTo').lean()).map(
    (o) => o.reachOutTo
  )
  const existingSet = new Set(existingOppNames)

  const preparedIndividuals = await Promise.all(
    allIndividuals.map(async (person) => {
      const background = person.scraped_data.background_information
      const isThinProfile = !background || background.trim().length < 50

      if (isThinProfile) {
        let reason = !background
          ? 'is null/undefined'
          : `is too short (${background.trim().length} chars)`
        logger.trace(
          { person: person.name, reason },
          `Identified as thin profile because background_information ${reason}.`
        )
      }

      const preparedPersonObject = {
        name: person.name,
        city: person.scraped_data.city,
        country: getCountry(person.scraped_data.city),
        industry: person.industry,
        wealthMillionsUSD: parseWealth(person.scraped_data.current_wealth),
        background: isThinProfile ? null : background,
        wealthSummary: person.scraped_data.wealth_summary,
        primaryCompany: person.scraped_data.roles?.[0]?.company || person.industry,
        year: jsonData.list_metadata.year,
        isExisting: existingSet.has(person.name),
        isThinProfile,
      }

      return preparedPersonObject
    })
  )

  return { allIndividuals: preparedIndividuals, rawIndividualData: allIndividuals }
}
