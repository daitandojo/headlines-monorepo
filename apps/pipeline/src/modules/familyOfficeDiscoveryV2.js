// apps/pipeline/src/modules/familyOfficeDiscoveryV2.js
// Tier 1.4: Proactive Family Office Discovery Engine (V2)
// Uses Kimi K2's web_search to discover FOs for every UHNW opportunity
import { logger } from '@headlines/utils-shared'
import { callKimiModel, isKimiConfigured } from '@headlines/ai-services'
import { FamilyOffice, Opportunity, SynthesizedEvent } from '@headlines/models'
import { buildFOQuery, getLocalizedSearchTerms } from '../utils/localizedSearchTerms.js'

const NON_SURNAME_WORDS = new Set([
  'family', 'board', 'foundation', 'foundations', 'group', 'holding', 'holdings',
  'capital', 'investments', 'investment', 'partners', 'partner', 'limited', 'ltd',
  'llc', 'inc', 'corp', 'corporation', 'gmbh', 'bv', 'nv', 'as', 'aps',
  'company', 'co', 'management', 'advisors', 'advisory', 'trust', 'estate',
  'office', 'offices', 'fund', 'funds', 'asset', 'assets', 'wealth',
])

function extractSurname(entityName) {
  const nameParts = entityName.trim().split(/\s+/)
  for (let i = nameParts.length - 1; i >= 0; i--) {
    const word = nameParts[i].replace(/[^a-zA-ZæøåÆØÅäöüÄÖÜéÉ-]/g, '')
    if (word.length >= 2 && !NON_SURNAME_WORDS.has(word.toLowerCase())) {
      return word
    }
  }
  return null
}

export async function discoverFamilyOffices(events, opportunities) {
  const discovered = []

  const entityNames = new Set()
  const entityCountryMap = new Map()

  for (const ev of events) {
    const country = ev.country?.[0] || ev.primarySubject?.country || null
    if (ev.primarySubject?.name) {
      entityNames.add(ev.primarySubject.name)
      entityCountryMap.set(ev.primarySubject.name.toLowerCase(), country)
    }
    for (const ki of (ev.key_individuals || [])) {
      if (ki.name) {
        entityNames.add(ki.name)
        if (!entityCountryMap.has(ki.name.toLowerCase())) {
          entityCountryMap.set(ki.name.toLowerCase(), country || ki.company ? null : country)
        }
      }
    }
    for (const ubo of (ev.transactionDetails?.sellerUBOs || [])) {
      if (ubo.name) {
        entityNames.add(ubo.name)
        if (!entityCountryMap.has(ubo.name.toLowerCase())) {
          entityCountryMap.set(ubo.name.toLowerCase(), country)
        }
      }
    }
    for (const ubo of (ev.transactionDetails?.buyerUBOs || [])) {
      if (ubo.name) {
        entityNames.add(ubo.name)
        if (!entityCountryMap.has(ubo.name.toLowerCase())) {
          entityCountryMap.set(ubo.name.toLowerCase(), country)
        }
      }
    }
  }
  for (const opp of (opportunities || [])) {
    entityNames.add(opp.reachOutTo)
    if (!entityCountryMap.has(opp.reachOutTo.toLowerCase()) && opp.basedIn?.length) {
      entityCountryMap.set(opp.reachOutTo.toLowerCase(), opp.basedIn[0])
    }
  }

  for (const name of entityNames) {
    try {
      const surname = extractSurname(name)
      if (surname) {
        const existing = await FamilyOffice.findOne({
          clientNames: { $regex: new RegExp(surname, 'i') },
        })
        if (existing) continue
      }

      const country = entityCountryMap.get(name.toLowerCase())
      const result = await searchForFamilyOffice(name, country)
      if (result) {
        await upsertFamilyOffice(result, name)
        discovered.push(result)
      }
    } catch (err) {
      logger.warn({ err: err.message }, `[FO Discovery] Failed for ${name}`)
    }
  }

  logger.info(`[FO Discovery] Discovered ${discovered.length} family offices`)
  return discovered
}

async function searchForFamilyOffice(entityName, country) {
  if (!isKimiConfigured()) return null

  const surname = extractSurname(entityName)
  if (!surname) return null

  const foQuery = buildFOQuery(surname, country)
  const wealthQuery = `"${entityName}" (vermogen OR formue OR fortune OR wealth OR patrimonio)`
  const local = getLocalizedSearchTerms(country)
  const searchLang = local?.searchLanguage || 'en'

  try {
    const result = await callKimiModel({
      systemPrompt: `You are a wealth intelligence analyst. Search for the family office associated with this individual. A family office manages their wealth and investments.
CRITICAL: The individual is from ${country || 'an unknown country'}. If they are from Denmark, the Netherlands, Germany, etc., use LOCALIZED search terms in the local language, not English. For example:
- Danish: "formue" not "wealth", "familiekontor" not "family office"
- Dutch: "vermogen" not "wealth", "familievermogen" not "family office"
- German: "Vermögen" not "wealth"
Search the web thoroughly using the local language. Return JSON: { fo_name (string or null), fo_type ("single_family"/"multi_family"/"virtual"/"embedded"/null), location (string or null), aum_estimate_usd_mm (number or null), website (string or null), confidence ("confirmed"/"probable"/"possible"), summary (string), search_queries_used (string[]) }`,
      userContent: `Search for the family office of ${entityName} (surname: ${surname}, country: ${country || 'unknown'}).
Use localized search queries. For example:
- If Danish: "{surname} familiekontor", "{surname} formue", "{surname} holding"
- If Dutch: "{surname} familievermogen", "{surname} vermogensbeheer", "{surname} holding"
- Otherwise use: "{surname} family office", "{surname} capital", "{surname} investments", "{surname} holding"
Also search: ${foQuery}`,
      isJson: true,
      maxToolRounds: 3,
    })

    if (result && result.fo_name) {
      return {
        name: result.fo_name,
        investmentType: result.fo_type || 'unknown',
        location: result.location,
        country: country || null,
        estimatedAUM_USD_MM: result.aum_estimate_usd_mm,
        clientNames: [entityName],
        website: result.website,
        confidence: result.confidence || 'possible',
        source: `FO Discovery: ${entityName}`,
        lastSeenDate: new Date(),
      }
    }
  } catch (err) {
    logger.warn({ err: err.message }, `[FO Discovery] Kimi search failed for ${entityName}`)
  }
  return null
}

async function upsertFamilyOffice(foData, clientName) {
  try {
    const existing = await FamilyOffice.findOne({ name: foData.name })
    if (existing) {
      await FamilyOffice.updateOne(
        { _id: existing._id },
        {
          $addToSet: { clientNames: clientName },
          $set: { lastSeenDate: new Date() },
        }
      )
      if (!existing.estimatedAUM_USD_MM && foData.estimatedAUM_USD_MM) {
        await FamilyOffice.updateOne(
          { _id: existing._id },
          { $set: { estimatedAUM_USD_MM: foData.estimatedAUM_USD_MM } }
        )
      }
    } else {
      const fo = new FamilyOffice(foData)
      await fo.save()
    }
    logger.info(`[FO Discovery] Saved: ${foData.name}`)
  } catch (err) {
    if (err.code !== 11000) logger.warn({ err: err.message }, '[FO Discovery] Save failed')
  }
}

export async function getFamilyOfficeSummary() {
  const total = await FamilyOffice.countDocuments()
  const byType = await FamilyOffice.aggregate([
    { $group: { _id: '$investmentType', count: { $sum: 1 } } },
  ])
  const topAUM = await FamilyOffice.find()
    .sort({ estimatedAUM_USD_MM: -1 })
    .limit(10)
    .lean()
  return { total, byType, topAUM }
}