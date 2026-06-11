// apps/pipeline/src/modules/filings/filingScraper.js
// Tier 1.1: Regulatory & Corporate Filing Intelligence
// Scrapes SEC EDGAR, Companies House, DK CVR for wealth-relevant filings
import { logger } from '@headlines/utils-shared'
import { callKimiModel, isKimiConfigured, callLanguageModel } from '@headlines/ai-services'
import { RegulatoryFiling, EntityGraph, SynthesizedEvent, Opportunity } from '@headlines/models'

const FILING_SCRAPE_INTERVAL_MS = 24 * 60 * 60 * 1000
const lastCheckedMap = new Map()

export async function scrapeAllFilings(runId) {
  const results = []
  try {
    if (shouldSkipJurisdiction('us_sec')) {
      logger.info('[FilingScraper] SEC EDGAR skipped (checked within 24h)')
    } else {
      const sec = await scrapeSECFilings(runId)
      results.push(...sec)
    }

    if (shouldSkipJurisdiction('uk_companies_house')) {
      logger.info('[FilingScraper] Companies House skipped (checked within 24h)')
    } else {
      const uk = await scrapeCompaniesHouseFilings(runId)
      results.push(...uk)
    }

    if (shouldSkipJurisdiction('dk_cvr')) {
      logger.info('[FilingScraper] DK CVR skipped (checked within 24h)')
    } else {
      const dk = await scrapeDKCVRFilings(runId)
      results.push(...dk)
    }
  } catch (err) {
    logger.error({ err: err.message }, '[FilingScraper] Fatal error')
  }
  logger.info(`[FilingScraper] ${results.length} new filings processed`)
  for (const r of results) {
    if (r.filingId) lastCheckedMap.set(`jurisdiction_${r.jurisdiction}`, Date.now())
  }
  return results
}

function shouldSkipJurisdiction(jurisdiction) {
  const last = lastCheckedMap.get(`jurisdiction_${jurisdiction}`)
  return last && (Date.now() - last) < FILING_SCRAPE_INTERVAL_MS
}

// ─── SEC EDGAR ───────────────────────────────────────────────

async function scrapeSECFilings(runId) {
  try {
    const trackedCompanies = await EntityGraph.find({ type: 'company' }).select('name aliases').lean()
    const tickerMap = extractSECIdentifiers(trackedCompanies)

    const allFilings = []
    for (const [identifier, entities] of tickerMap) {
      try {
        const filings = await fetchSECFilings(identifier)
        for (const filing of filings) {
          const processed = await processSECFiling(filing, entities, runId)
          if (processed) allFilings.push(processed)
        }
      } catch (err) {
        logger.warn({ err: err.message }, `[FilingScraper] SEC fetch failed for ${identifier}`)
      }
      await sleep(150)
    }
    return allFilings
  } catch (err) {
    logger.error({ err: err.message }, '[FilingScraper] SEC EDGAR scrape failed')
    return []
  }
}

function extractSECIdentifiers(companies) {
  const map = new Map()
  for (const c of companies) {
    const name = c.name?.toLowerCase()
    if (!name) continue
    const ticker = extractTicker(name)
    if (ticker) {
      if (!map.has(ticker)) map.set(ticker, [])
      map.get(ticker).push(c)
    }
  }
  return map
}

function extractTicker(name) {
  const knownTickers = {
    'novo nordisk': 'NVO', 'novozymes': 'NVZM', 'maersk': 'AMKBY',
    'vestas': 'VWDRY', 'danske bank': 'DNKEY', 'carlsberg': 'CABGY',
    'dsv': 'DVBYF', 'coloplast': 'CLPBY', 'genmab': 'GMAB',
    'tryg': 'TGVSF', 'pandora': 'PANDY', 'gn store nord': 'GNNDY',
    'rockwool': 'RKWB', 'demant': 'DEMTF', 'jyske bank': 'JYSKY',
    'sydbank': 'SYDB', 'ringkjøbing landbobank': 'RILBO', 'alm brand': 'ALBKF',
    'simcorp': 'SIMC', 'novo holdings': 'NVHL',
  }
  for (const [key, ticker] of Object.entries(knownTickers)) {
    if (name.includes(key)) return ticker
  }
  return null
}

async function fetchSECFilings(ticker) {
  const url = `https://data.sec.gov/submissions/CIK${await lookupCIK(ticker)}.json`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Headlines Intelligence (contact@headlines.dev)' },
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) return []
  const data = await res.json()
  const filingTypes = ['8-K', '13D', '13G', 'SC 13D', 'SC 13G', '13D/A', '13G/A']
  return (data.files?.recent?.form || []).map((form, i) => ({
    filingType: form,
    accessionNumber: data.files.recent.accessionNumber?.[i],
    filingDate: data.files.recent.filingDate?.[i],
    primaryDocument: data.files.recent.primaryDocument?.[i],
    description: data.files.recent.primaryDocDescription?.[i],
    url: `https://www.sec.gov/ix?doc=/Archives/edgar/data/${data.cik}/${data.files.recent.accessionNumber?.[i]?.replace(/-/g, '')}/${data.files.recent.primaryDocument?.[i]}`,
  })).filter(f => filingTypes.includes(f.filingType)).slice(0, 10)
}

const cikCache = new Map()
async function lookupCIK(ticker) {
  if (cikCache.has(ticker)) return cikCache.get(ticker)
  try {
    const res = await fetch(`https://data.sec.gov/submissions/CIK${ticker}.json`, {
      headers: { 'User-Agent': 'Headlines Intelligence (contact@headlines.dev)' },
      signal: AbortSignal.timeout(8000),
    })
    if (res.ok) {
      const data = await res.json()
      const cik = String(data.cik).padStart(10, '0')
      cikCache.set(ticker, cik)
      return cik
    }
  } catch {}
  const res2 = await fetch(`https://www.sec.gov/cgi-bin/browse-edgar?CIK=${ticker}&action=getcompany`, {
    headers: { 'User-Agent': 'Headlines Intelligence (contact@headlines.dev)' },
    signal: AbortSignal.timeout(8000),
  })
  const text = await res2.text()
  const match = text.match(/CIK=(\d{10})/)
  if (match) {
    cikCache.set(ticker, match[1])
    return match[1]
  }
  cikCache.set(ticker, '0000000000')
  return '0000000000'
}

async function processSECFiling(filing, entities, runId) {
  if (!filing.accessionNumber) return null

  const existing = await RegulatoryFiling.findOne({ filingId: `sec_${filing.accessionNumber}` })
  if (existing) return null

  let aiSummary = null
  if (isKimiConfigured()) {
    try {
      const result = await callKimiModel({
        systemPrompt: 'You are a financial intelligence analyst. Summarize this SEC filing in plain English for a wealth manager. Focus on: who it affects, what changed (ownership, board, finances), and wealth implications. Return as JSON with keys: summary, subjects_found (array), has_wealth_implications (boolean), estimated_amount_usd_mm (number or null), filing_type_actual.',
        userContent: `Filing type: ${filing.filingType}\nDate: ${filing.filingDate}\nDescription: ${filing.description || 'N/A'}\nURL: ${filing.url}`,
        isJson: true,
        maxToolRounds: 5,
      })
      aiSummary = result
    } catch (err) {
      logger.warn({ err: err.message }, '[FilingScraper] Kimi summary failed')
    }
  }

  const doc = new RegulatoryFiling({
    filingId: `sec_${filing.accessionNumber}`,
    filingType: filing.filingType,
    companyName: entities[0]?.name || filing.description?.split(' - ')[0] || 'Unknown',
    jurisdiction: 'us_sec',
    filingDate: new Date(filing.filingDate),
    subjects: aiSummary?.subjects_found || [],
    aiSummary: aiSummary?.summary || null,
    sourceUrl: filing.url,
    linkedEntities: entities.map(e => e._id),
  })

  try {
    await doc.save()
    logger.info(`[FilingScraper] SEC filing saved: ${filing.filingType} for ${doc.companyName}`)

    if (aiSummary?.has_wealth_implications) {
      const opportunities = await Opportunity.find({ basedIn: { $in: entities.map(e => e.name) } }).select('_id').lean()
      if (opportunities.length > 0) {
        await RegulatoryFiling.updateOne(
          { _id: doc._id },
          { $set: { linkedOpportunities: opportunities.map(o => o._id) } }
        )
      }
    }
    return doc.toObject()
  } catch (err) {
    if (err.code !== 11000) logger.warn({ err: err.message }, '[FilingScraper] Save failed')
    return null
  }
}

// ─── Companies House ─────────────────────────────────────────

async function scrapeCompaniesHouseFilings(runId) {
  try {
    const trackedCompanies = await EntityGraph.find({ type: 'company' }).select('name aliases').lean()
    const allFilings = []
    for (const company of trackedCompanies.slice(0, 20)) {
      try {
        const filings = await fetchCompaniesHouseFilings(company.name)
        for (const filing of filings) {
          const processed = await processCHFiling(filing, company, runId)
          if (processed) allFilings.push(processed)
        }
      } catch (err) {
        logger.warn({ err: err.message }, `[FilingScraper] CH fetch failed for ${company.name}`)
      }
    }
    return allFilings
  } catch (err) {
    logger.error({ err: err.message }, '[FilingScraper] Companies House scrape failed')
    return []
  }
}

async function fetchCompaniesHouseFilings(companyName) {
  const baseUrl = 'https://api.company-information.service.gov.uk'
  const apiKey = process.env.COMPANIES_HOUSE_API_KEY || ''
  const encoded = btoa(apiKey)

  const searchRes = await fetch(`${baseUrl}/search/companies?q=${encodeURIComponent(companyName)}`, {
    headers: { Authorization: `Basic ${encoded}` },
    signal: AbortSignal.timeout(8000),
  })
  if (!searchRes.ok) return []
  const searchData = await searchRes.json()
  const company = searchData.items?.[0]
  if (!company?.company_number) return []

  const filingsRes = await fetch(`${baseUrl}/company/${company.company_number}/filing-history`, {
    headers: { Authorization: `Basic ${encoded}` },
    signal: AbortSignal.timeout(8000),
  })
  if (!filingsRes.ok) return []
  const filingsData = await filingsRes.json()

  const wealthRelevantCategories = ['capital', 'accounts', 'mortgage', 'insolvency', 'incorporation', 'officers', 'confirmation']
  return (filingsData.items || []).filter(f =>
    wealthRelevantCategories.some(c => f.category?.includes(c))
  ).slice(0, 5).map(f => ({
    transactionId: f.transaction_id,
    filingType: f.category,
    description: f.description,
    date: f.date,
    paperFiled: f.paper_filed,
    companyNumber: company.company_number,
    companyName: company.company_name,
  }))
}

async function processCHFiling(filing, entity, runId) {
  const filingId = `ch_${filing.companyNumber}_${filing.transactionId || filing.date}_${filing.filingType}`
  const existing = await RegulatoryFiling.findOne({ filingId })
  if (existing) return null

  const doc = new RegulatoryFiling({
    filingId,
    filingType: mapCHCategory(filing.filingType),
    companyName: filing.companyName,
    jurisdiction: 'uk_companies_house',
    filingDate: new Date(filing.date),
    subjects: [],
    aiSummary: filing.description || null,
    sourceUrl: `https://find-and-update.company-information.service.gov.uk/company/${filing.companyNumber}/filing-history`,
    linkedEntities: [entity._id],
  })
  try {
    await doc.save()
    logger.info(`[FilingScraper] CH filing saved: ${filing.filingType} for ${filing.companyName}`)
    return doc.toObject()
  } catch (err) {
    if (err.code !== 11000) logger.warn({ err: err.message }, '[FilingScraper] CH save failed')
    return null
  }
}

function mapCHCategory(category) {
  const map = { 'capital': 'SHARE_TRANSFER', 'accounts': 'ANNUAL_RETURN', 'mortgage': 'CHARGE', 'insolvency': 'INSOLVENCY', 'confirmation': 'CONFIRMATION_STATEMENT', 'officers': 'DIRECTOR_APPOINTMENT' }
  return map[category] || 'OTHER'
}

// ─── DK CVR ──────────────────────────────────────────────────

async function scrapeDKCVRFilings(runId) {
  try {
    const trackedCompanies = await EntityGraph.find({ type: 'company' }).select('name aliases').lean()
    const allFilings = []
    for (const company of trackedCompanies.slice(0, 10)) {
      try {
        const filings = await fetchDKCVRFilings(company.name)
        for (const filing of filings) {
          const processed = await processCVRFiling(filing, company, runId)
          if (processed) allFilings.push(processed)
        }
      } catch (err) {
        logger.warn({ err: err.message }, `[FilingScraper] CVR fetch failed for ${company.name}`)
      }
    }
    return allFilings
  } catch (err) {
    logger.error({ err: err.message }, '[FilingScraper] DK CVR scrape failed')
    return []
  }
}

async function fetchDKCVRFilings(companyName) {
  const url = `https://datacvr.virk.dk/api/unity/search?query=${encodeURIComponent(companyName)}&page=0&size=5`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Headlines Intelligence (contact@headlines.dev)' },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) return []
  const data = await res.json()
  const hits = data?.hits?.hits || []
  return hits.slice(0, 3).map(h => {
    const s = h._source || {}
    return {
      cvrNumber: s.cvrNumber,
      name: s.name,
      status: s.status,
      companyForm: s.companyForm,
      city: s.city,
      industryCode: s.industryCode,
    }
  })
}

async function processCVRFiling(filing, entity, runId) {
  const filingId = `cvr_${filing.cvrNumber}_${Date.now()}`
  const existing = await RegulatoryFiling.findOne({ filingId })
  if (existing) return null

  const doc = new RegulatoryFiling({
    filingId,
    filingType: 'CONFIRMATION_STATEMENT',
    companyName: filing.name,
    companyIdentifier: filing.cvrNumber,
    jurisdiction: 'dk_cvr',
    filingDate: new Date(),
    subjects: [],
    aiSummary: `Status: ${filing.status}, Form: ${filing.companyForm}, City: ${filing.city}`,
    sourceUrl: `https://datacvr.virk.dk/enhed/virksomhed/${filing.cvrNumber}`,
    linkedEntities: [entity._id],
  })
  try {
    await doc.save()
    logger.info(`[FilingScraper] CVR filing saved: ${filing.name}`)
    return doc.toObject()
  } catch (err) {
    if (err.code !== 11000) logger.warn({ err: err.message }, '[FilingScraper] CVR save failed')
    return null
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

export async function getNewFilingsSince(date) {
  return RegulatoryFiling.find({ filingDate: { $gte: date } }).sort({ filingDate: -1 }).lean()
}