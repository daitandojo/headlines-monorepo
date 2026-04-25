// packages/ai-services/src/enrichment/priorityAndTiming.js
// PHASE 3 & 4: Priority scoring, conduit discovery, family office search,
// follow-up date calculation, and liquidity event processing.
import { logger } from '@headlines/utils-shared'
import { Opportunity } from '@headlines/models'
import { extractConduitsWithLLM } from './conduitLLMExtractor.js'

const CONDUIT_TYPES = ['pa', 'cfo', 'legal', 'tax', 'trust', 'banker', 'advisor', 'other']

const LOCKUP_DAYS = 150
const PROBATE_MONTHS = 6

export function calculateFollowUpDate(dealCloseDate, eventStatus, classification) {
  // Case 1: Direct deal close date provided
  if (dealCloseDate) {
    return { date: dealCloseDate, reason: 'Post-close proceeds available for deployment' }
  }
  // Case 2: Pending or Rumored - estimate quarter
  if (eventStatus === 'Pending' || eventStatus === 'Rumored') {
    const now = new Date()
    const q = now.getMonth() < 9 ? Math.ceil((now.getMonth() + 3) / 3) : 1
    const year = q === 1 ? now.getFullYear() + 1 : now.getFullYear()
    const dateStr = `${year}-${String(q * 3).padStart(2, '0')}`
    return { date: `Est. Q${q} ${year}`, reason: 'Routine re-screen — pending deal' }
  }
  // Case 3: IPO lockup
  if (classification === 'TC9_IPO') {
    const d = new Date()
    d.setDate(d.getDate() + LOCKUP_DAYS)
    return { date: d.toISOString().split('T')[0], reason: 'Lockup expiry — founder shares become liquid' }
  }
  // Case 4: Estate/probate
  if (classification === 'TC8_SUCCESSION' || classification === 'TC1_FAMILY_FOUNDER') {
    const d = new Date()
    d.setMonth(d.getMonth() + PROBATE_MONTHS)
    return { date: d.toISOString().split('T')[0], reason: 'Typical European probate horizon — heirs receive assets' }
  }
  // Case 5: PE exit
  if (classification === 'TC4_PRIVATE_EQUITY') {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    return { date: d.toISOString().split('T')[0], reason: 'Carry distribution lag — partner liquidity expected' }
  }
  // Case 6: No timing known - routine re-screen
  return { date: null, reason: 'No timing known — routine monitoring' }
}

export function computePriority(opportunity) {
  // GAP 4: Full weighted composite scoring
  let score = 0
  const opp = opportunity
  const wealthMM = opp.profile?.estimatedNetWorthMM || opp.lastKnownEventLiquidityMM || 0

  // Wealth magnitude scoring
  if (wealthMM >= 1000) score += 40
  else if (wealthMM >= 100) score += 30
  else if (wealthMM >= 30) score += 20
  else if (wealthMM >= 5) score += 10

  // Timing urgency scoring
  const liquidityAmt = opp.liquidityEvent?.estimatedAmountMM || opp.lastKnownEventLiquidityMM || 0
  const timingType = opp.liquidityEvent?.timingType
  const hasLiquidity = liquidityAmt > 0
  if (timingType === 'past' && hasLiquidity) score += 30  // Immediate liquidity
  else if (timingType === 'pending' && hasLiquidity) score += 20
  else if (timingType === 'rumored' && hasLiquidity) score += 10

  // Access quality scoring
  if (opp.accessPath?.conduits?.length > 0) score += 10
  if (opp.accessPath?.familyOffice) score += 10
  if (opp.accessPath?.primaryContact?.name) score += 10

  // Trigger class weight
  const tc = opp.triggerClass
  if (tc === 'TC3_MA_SELLER' || tc === 'TC9_IPO') score += 15
  else if (tc === 'TC1_FAMILY_FOUNDER' || tc === 'TC8_SUCCESSION') score += 10
  else if (tc === 'TC4_PRIVATE_EQUITY' || tc === 'TC6_REAL_ESTATE') score += 8
  else if (tc === 'TC2_MA_BUYER' || tc === 'TC5_LISTED_COMPANY') score += 5

  // Openness signals
  const openness = opp.profile?.opennessSignals?.length || 0
  score += Math.min(openness * 5, 15)

  // Priority bands
  let priority = 'low'
  if (score >= 60) priority = 'high'
  else if (score >= 30) priority = 'medium'

  return { priority, priorityScore: score }
}

export function buildAccessPath(opportunity, conduits) {
  const accessPath = opportunity.accessPath || {}
  if (conduits && conduits.length > 0) {
    accessPath.conduits = conduits.map((c) => ({
      name: c.name || '',
      role: c.role || null,
      firm: c.firm || null,
      email: c.email || null,
      phone: c.phone || null,
      relationship: c.relationship || null,
      type: CONDUIT_TYPES.includes(c.type) ? c.type : 'other',
    }))
  }
  return accessPath
}

export function buildLiquidityEvent(event) {
  if (!event) return null
  const { transactionDetails, eventStatus, dealCloseDate, eventClassification, triggerClass } = event
  const flow = transactionDetails?.liquidityFlow
  if (!flow && !eventClassification && !triggerClass) return null
  let type = 'other'
  // Classification-based mapping
  const cls = eventClassification || ''
  if (cls.includes('New Wealth') || cls.includes('Wealth Mentioned')) {
    type = 'exit_proceeds'
  } else if (cls.includes('Future Wealth')) {
    type = 'fundraise'
  } else if (cls.includes('Legal') || cls.includes('Dispute')) {
    type = 'probate'
  }
  // Trigger class-based mapping (more precise)
  if (triggerClass === 'TC9_IPO') type = 'ipo_lockup'
  else if (triggerClass === 'TC3_MA_SELLER') type = 'exit_proceeds'
  else if (triggerClass === 'TC8_SUCCESSION') type = 'succession'
  else if (triggerClass === 'TC1_FAMILY_FOUNDER') type = 'succession'
  // Nature-based override
  if (flow?.nature) {
    const n = flow.nature.toLowerCase()
    if (n.includes('dividend')) type = 'dividend'
    else if (n.includes('earnout')) type = 'earnout'
    else if (n.includes('ipo') || n.includes('listing')) type = 'ipo_lockup'
    else if (n.includes('carry') || n.includes('carried')) type = 'pe_exit'
    else if (n.includes('inheritance') || n.includes('estate') || n.includes('probate')) type = 'probate'
    else if (n.includes('succession') || n.includes('inheritance')) type = 'succession'
  }
  let timingType = null
  if (eventStatus === 'Completed') timingType = 'past'
  else if (eventStatus === 'Pending') timingType = 'pending'
  else if (eventStatus === 'Rumored') timingType = 'rumored'
  const amount = flow?.approxAmountUSD || null
  const followUpDate = calculateFollowUpDate(dealCloseDate, eventStatus, triggerClass)
  return {
    type,
    description: flow?.nature || null,
    estimatedAmountMM: amount,
    estimatedCurrency: amount ? 'USD' : null,
    timingType,
    estimatedDate: followUpDate,
    dealCloseDate: dealCloseDate || null,
    source: null,
  }
}

export function detectConduitsFromText(text, targetName) {
  if (!text || !targetName) return []
  const conduits = []
  const targetLower = targetName.toLowerCase()
  // Simplified robust patterns - word boundary anchored
  const patterns = [
    // PA: "PA [to/for] Name Name" or "Name Name's PA"
    { regex: /PA\s+(?:to|for)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/i, type: 'pa', role: 'Personal Assistant', firmExtract: null },
    // Lawyer: "lawyer [at/from] Firm" or "Name, lawyer"
    { regex: /lawyer\s+(?:at|from)\s+([A-Za-z\s]+?)(?:\.|,|\s+and)/i, type: 'legal', role: 'Legal Counsel', firmExtract: 1 },
    // Solicitor: "solicitor at/from Firm"
    { regex: /solicitor\s+(?:at|from)\s+([A-Za-z\s]+?)(?:\.|,)/i, type: 'legal', role: 'Legal Counsel', firmExtract: 1 },
    // Private banker: "private banker at Firm"
    { regex: /private\s+banker\s+(?:at|with)\s+([A-Za-z\s]+?)(?:\.|,)/i, type: 'banker', role: 'Private Banker', firmExtract: 1 },
    // Wealth manager at Firm
    { regex: /wealth\s+manager\s+(?:at|with)\s+([A-Za-z\s]+?)(?:\.|,)/i, type: 'banker', role: 'Wealth Manager', firmExtract: 1 },
  ]
  for (const pat of patterns) {
    const match = text.match(pat.regex)
    if (match) {
      const name = match[1]?.trim()
      const firm = match[pat.firmExtract]?.trim()
      if (name && name.length > 3 && !name.toLowerCase().includes('the ') && !name.toLowerCase().includes('family')) {
        const cleanName = name.replace(/\s+$/, '').split(' at ')[0]
        if (!conduits.some(c => c.name?.toLowerCase() === cleanName.toLowerCase() && c.type === pat.type)) {
          conduits.push({ name: cleanName, role: pat.role, firm: firm || null, type: pat.type })
        }
      }
    }
  }
  return conduits.slice(0, 5)
}

export function deriveWealthEstimate(wealthMM) {
  if (!wealthMM || wealthMM <= 0) return null
  if (wealthMM >= 1000) return `$${Math.round(wealthMM / 1000)}B+`
  if (wealthMM >= 100) return `$${Math.round(wealthMM / 10) / 10}00M`
  if (wealthMM >= 30) return `$${wealthMM}M`
  return `$${wealthMM}M`
}

export async function enrichOpportunityWithPriority(opportunity, event) {
  const enriched = { ...opportunity }
  // Default type to 'beneficiary' if not set
  enriched.type = enriched.type || 'beneficiary'
  // Build accessPath structure
  enriched.accessPath = buildAccessPath(enriched, [])
  // Copy heirsApparent to profile if present in event or opportunity
  if (event?.successionSignals?.namedHeirApparent && enriched.profile) {
    enriched.profile.heirsApparent = [event.successionSignals.namedHeirApparent]
  }
  if (event) {
    enriched.liquidityEvent = buildLiquidityEvent(event)
    enriched.triggerClass = event.triggerClass || null
    enriched.successionSignals = event.successionSignals || null
    if (event.dealCloseDate || event.eventStatus) {
      const { date, reason } = calculateFollowUpDate(
        event.dealCloseDate,
        event.eventStatus,
        event.triggerClass,
      )
      enriched.followUpDate = date
      enriched.followUpReason = reason
    }
  }
  
  // GAP 4: LLM conduit extraction for access quality scoring
  try {
    const rawContext = event?.synthesized_summary || event?.combinedContext || event?.context_text || ''
    if (rawContext.length > 100) {
      logger.info({ name: enriched.reachOutTo, contextLength: rawContext.length }, '[Conduit LLM] Extracting conduits')
      const llmConduits = await extractConduitsWithLLM(rawContext, enriched.reachOutTo, enriched.basedIn?.[0])
      if (llmConduits && llmConduits.length > 0) {
        enriched.accessPath = enriched.accessPath || {}
        enriched.accessPath.conduits = llmConduits
        logger.info({ name: enriched.reachOutTo, count: llmConduits.length }, '[Conduit LLM] Found conduits')
      } else {
        logger.info({ name: enriched.reachOutTo }, '[Conduit LLM] No conduits found')
      }
    }
  } catch (err) {
    logger.warn({ err: err.message }, '[Conduit LLM] Extraction failed')
  }
  
  const priorityResult = computePriority(enriched)
  enriched.priority = priorityResult.priority
  enriched.priorityScore = priorityResult.priorityScore
  if (enriched.profile?.estimatedNetWorthMM) {
    enriched.wealthEstimate = deriveWealthEstimate(enriched.profile.estimatedNetWorthMM)
  }
  return enriched
}

export const PRIORITY_RULES = {
  HIGH: [
    'Liquidity event confirmed + timing <18 months + wealth >$30M',
    'Succession signal score >= 2',
    'IPO lockup expiry within 12 months',
    'PE exit with estimated proceeds >$50M',
  ],
  MEDIUM: [
    'Liquidity event probable but timing unclear',
    'Wealth estimated $5-30M',
    'Listed company with founder/CEO disclosed holding >2%',
    'Pending transaction announced but no close date',
  ],
  LOW: [
    'Second-degree adjacency',
    'No confirmed trigger',
    'Filed for monitoring',
    'Wealth estimated <$5M with no event',
  ],
}