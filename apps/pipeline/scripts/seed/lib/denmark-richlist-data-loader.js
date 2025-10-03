// apps/pipeline/scripts/seed/lib/denmark-richlist-data-loader.js
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Opportunity } from '@headlines/models'
import { logger } from '@headlines/utils-shared'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const BASE_PATH = path.resolve(__dirname, '../../')
const DKK_TO_USD_RATE = 0.14 // Approximate conversion rate

// DEFINITIVE FIX: Expanded city-to-country mapping to be more comprehensive
const cityToCountryMap = {
  london: 'United Kingdom',
  geneva: 'Switzerland',
  zug: 'Switzerland',
  dubai: 'United Arab Emirates',
  boston: 'United States',
  'palo alto': 'United States',
  'san francisco': 'United States',
  'new york': 'United States',
  'los angeles': 'United States',
  frankfurt: 'Germany',
  munich: 'Germany',
  berlin: 'Germany',
  sydney: 'Australia',
  marbella: 'Spain',
  mallorca: 'Spain',
  'monte carlo': 'Monaco',
  lugano: 'Switzerland',
  utrecht: 'Netherlands',
  reykjavik: 'Iceland',
  copenhagen: 'Denmark',
  aarhus: 'Denmark',
  odense: 'Denmark',
  aalborg: 'Denmark',
  esbjerg: 'Denmark',
}

function getCountryFromCity(city) {
  if (!city) return 'Denmark'
  const lowerCity = city.toLowerCase()
  return cityToCountryMap[lowerCity] || 'Denmark'
}

export async function loadAndPrepareDenmarkRichlist() {
  const jsonPath = path.join(BASE_PATH, 'seed/data/denmark.json')
  const rawIndividuals = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))

  const uniqueIndividuals = Array.from(
    new Map(rawIndividuals.map((item) => [item['full name'], item])).values()
  )
  logger.info(
    `Loaded ${rawIndividuals.length} total individuals from ${path.basename(jsonPath)}, filtered down to ${uniqueIndividuals.length} unique entries.`
  )

  const existingOppNames = (await Opportunity.find({}).select('reachOutTo').lean()).map(
    (o) => o.reachOutTo
  )
  const existingSet = new Set(existingOppNames)

  const preparedIndividuals = uniqueIndividuals.map((person) => {
    const wealthUSD = person['net worth'] * DKK_TO_USD_RATE
    const wealthMillionsUSD = Math.round(wealthUSD / 1000000)

    const background = `Based in: ${person.city}. Estimated Net Worth: $${wealthMillionsUSD}M USD. Event/History: ${person.event}`
    const isThinProfile = background.trim().length < 50

    const preparedPersonObject = {
      name: person['full name'],
      city: person.city,
      country: getCountryFromCity(person.city),
      industry: person.industry || 'Finance',
      wealthMillionsUSD: wealthMillionsUSD,
      background: background,
      wealthSummary: '',
      primaryCompany: 'Private Equity',
      year: new Date().getFullYear(),
      isExisting: existingSet.has(person['full name']),
      isThinProfile,
    }

    return preparedPersonObject
  })

  return { allIndividuals: preparedIndividuals, rawIndividualData: uniqueIndividuals }
}
