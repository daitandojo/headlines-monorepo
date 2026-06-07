// apps/pipeline/src/modules/dealAdvisorTracker.js
// Tier 1.3: Deal Advisor Intelligence
// Extracts professional services firms involved in deals from article text
import { logger } from '@headlines/utils-shared'
import { callKimiModel, isKimiConfigured, callLanguageModel } from '@headlines/ai-services'
import { DealAdvisor, SynthesizedEvent } from '@headlines/models'

const ADVISOR_KEYWORDS = [
  'advised by', 'acted for', 'counsel to', 'legal adviser', 'financial adviser',
  'served as', 'represented by', 'acting for', 'lead advisor', 'placement agent',
  'lead arranger', 'bookrunner', 'underwriter', 'due diligence', 'tax adviser',
  'auditor', 'accountant', 'consultant', 'boutique', 'sole advisor',
]

export async function extractDealAdvisors(savedEvents) {
  const allAdvisors = []
  for (const event of savedEvents) {
    try {
      const articles = event.source_articles || []
      for (const article of articles) {
        const headline = article.headline || ''
        if (!ADVISOR_KEYWORDS.some(kw => headline.toLowerCase().includes(kw))) continue
        const advisors = await extractAdvisorsFromText(headline, event)
        allAdvisors.push(...advisors)
      }
    } catch (err) {
      logger.warn({ err: err.message }, `[DealAdvisor] Failed for event ${event.event_key}`)
    }
  }

  for (const advisor of allAdvisors) {
    await upsertAdvisor(advisor)
  }
  logger.info(`[DealAdvisor] Extracted ${allAdvisors.length} advisors from ${savedEvents.length} events`)
  return allAdvisors
}

async function extractAdvisorsFromText(text, event) {
  if (!isKimiConfigured()) return extractAdvisorsBasic(text, event)

  try {
    const result = await callKimiModel({
      systemPrompt: 'You are a deal intelligence analyst. Extract all professional services firms (law firms, investment banks, accounting firms, consultants) mentioned as advisors in this deal text. Include their role. Return JSON: { advisors: [{ firm_name (string), firm_type (legal/financial/accounting/consulting/other), role (sell_side_advisor/buy_side_advisor/legal_counsel/auditor/placement_agent/financial_advisor/other), deal_value_usd_mm (number or null) }] }',
      userContent: `Deal: ${event.synthesized_headline}\nSummary: ${event.synthesized_summary}\n\nSource text: ${text}`,
      isJson: true,
      maxToolRounds: 3,
    })
    if (result?.advisors?.length) return result.advisors
  } catch (err) {
    logger.warn({ err: err.message }, '[DealAdvisor] Kimi extraction failed, using basic')
  }
  return extractAdvisorsBasic(text, event)
}

function extractAdvisorsBasic(text, event) {
  const advisors = []
  const patterns = [
    { regex: /(?:advised by|counsel to|represented by|acting for)\s+([A-Z][A-Za-z\s&]+?)(?:\s+(?:on|in|,|\.|$))/g, role: 'legal_counsel', type: 'legal' },
    { regex: /(?:financial adviser|lead advisor|placement agent|lead arranger)\s+([A-Z][A-Za-z\s&]+?)(?:\s+(?:on|in|,|\.|$))/g, role: 'financial_advisor', type: 'financial' },
    { regex: /(?:auditor|accountant)\s+([A-Z][A-Za-z\s&]+?)(?:\s+(?:on|in|,|\.|$))/g, role: 'auditor', type: 'accounting' },
    { regex: /(?:consultant|adviser)\s+([A-Z][A-Za-z\s&]+?)(?:\s+(?:on|in|,|\.|$))/g, role: 'other', type: 'consulting' },
  ]
  for (const { regex, role, type } of patterns) {
    let m
    while ((m = regex.exec(text)) !== null) {
      const name = m[1].trim()
      if (name.length > 2 && !advisors.some(a => a.firm_name === name)) {
        advisors.push({ firm_name: name, firm_type: type, role, deal_value_usd_mm: event.transactionDetails?.valuationAtEventUSD || null })
      }
    }
  }
  return advisors
}

async function upsertAdvisor(advisor) {
  try {
    await DealAdvisor.findOneAndUpdate(
      { name: advisor.firm_name, type: advisor.firm_type },
      {
        $setOnInsert: {
          name: advisor.firm_name,
          type: advisor.firm_type,
          role: advisor.role,
          activeJurisdictions: [],
          dealCount: 0,
        },
        $inc: { dealCount: 1 },
        $set: { lastDealDate: new Date() },
      },
      { upsert: true }
    )
  } catch (err) {
    if (err.code !== 11000) logger.warn({ err: err.message }, '[DealAdvisor] Upsert failed')
  }
}

export async function getTopAdvisors(limit = 20) {
  return DealAdvisor.find().sort({ dealCount: -1 }).limit(limit).lean()
}