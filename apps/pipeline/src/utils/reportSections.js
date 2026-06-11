// apps/pipeline/src/utils/reportSections.js
import { truncateString, logger } from '@headlines/utils-shared'
import moment from 'moment'
import 'moment-duration-format'

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  grey: '\x1b[90m',
}

function calculateRate(numerator, denominator) {
  if (denominator === 0) return '0.00%'
  return ((numerator / denominator) * 100).toFixed(2) + '%'
}
function truncateSourceName(name) {
  if (!name) return 'N/A'
  const stopIndex = name.indexOf('(')
  return (stopIndex !== -1 ? name.substring(0, stopIndex) : name).trim()
}

// --- START OF MODIFICATION ---
function formatJudgeVerdictSummary(judgeVerdict) {
  if (!judgeVerdict) return ''
  const eventCount = judgeVerdict.event_judgements?.length || 0
  const oppCount = judgeVerdict.opportunity_judgements?.length || 0
  if (eventCount === 0 && oppCount === 0) return ''
  const getQualityCounts = (judgements) => {
    const counts = { positive: 0, negative: 0 }
    ;(judgements || []).forEach((j) => {
      const q = j.quality?.toLowerCase()
      // "Acceptable" is a positive outcome.
      if (q === 'excellent' || q === 'good' || q === 'acceptable') counts.positive++
      if (q === 'poor' || q === 'irrelevant') counts.negative++
    })
    return counts
  }
  const eventCounts = getQualityCounts(judgeVerdict.event_judgements)
  let summary = `  ${colors.magenta}Judge Verdict Summary:${colors.reset} ${eventCount} Events (${colors.green}${eventCounts.positive} OK${colors.reset}, ${colors.red}${eventCounts.negative} Bad${colors.reset})`
  return summary + '\n'
}
// --- END OF MODIFICATION ---

export function formatJudgeVerdictDetails(runStats) {
  const { judgeVerdict } = runStats
  if (
    !judgeVerdict ||
    (!judgeVerdict.event_judgements?.length &&
      !judgeVerdict.opportunity_judgements?.length)
  )
    return ''
  let section = `  ${colors.yellow}--- ⚖️ Judge's Final Verdict Details ---${colors.reset}\n`
  const formatVerdict = (v) => {
    const quality = v.quality.toUpperCase()
    let color = colors.reset
    if (['EXCELLENT', 'GOOD'].includes(quality)) color = colors.green
    if (['POOR', 'IRRELEVANT'].includes(quality)) color = colors.red
    if (['ACCEPTABLE', 'MARGINAL'].includes(quality)) color = colors.yellow
    return `  - ${color}[${quality.padEnd(10)}]${colors.reset} "${truncateString(v.identifier, 60)}"\n    ${colors.grey}└─ Commentary: ${v.commentary}${colors.reset}\n`
  }
  if (judgeVerdict.event_judgements?.length) {
    section += `  ${colors.cyan}Event Judgements:${colors.reset}\n`
    judgeVerdict.event_judgements.forEach((v) => {
      section += formatVerdict(v)
    })
  }
  if (judgeVerdict.opportunity_judgements?.length) {
    section += `  ${colors.cyan}Opportunity Judgements:${colors.reset}\n`
    judgeVerdict.opportunity_judgements.forEach((v) => {
      section += formatVerdict(v)
    })
  }
  return section + '\n'
}

export function formatRunFunnel(runStats) {
  let section = `  ${colors.yellow}--- Funnel & Conversion (This Run) ---${colors.reset}\n`
  const headlineToEnrichRate = calculateRate(
    runStats.relevantHeadlines,
    runStats.freshHeadlinesFound
  )
  const enrichToEventRate = calculateRate(
    runStats.relevantArticles,
    runStats.relevantHeadlines
  )
  const signalToNoiseRatio = calculateRate(
    runStats.eventsSynthesized,
    runStats.freshHeadlinesFound
  )
  section += `  ${'Headlines Scraped:'.padEnd(30)} ${runStats.headlinesScraped}\n`
  section += `  ${'Fresh/Refreshed Articles:'.padEnd(30)} ${runStats.freshHeadlinesFound}\n`
  section += `  ${'Headlines Assessed:'.padEnd(30)} ${runStats.headlinesAssessed}\n`
  section += `  ${'  > Relevant for Enrichment:'.padEnd(30)} ${runStats.relevantHeadlines} (${colors.cyan}${headlineToEnrichRate}${colors.reset})\n`
  section += `  ${'Articles Enriched:'.padEnd(30)} ${runStats.enrichmentOutcomes?.length || 0}\n`
  section += `  ${'  > Relevant for Event:'.padEnd(30)} ${runStats.relevantArticles} (${colors.cyan}${enrichToEventRate}${colors.reset})\n`
  section += `  ${'Events Synthesized:'.padEnd(30)} ${runStats.eventsSynthesized}\n`
  section += `  ${colors.green}${'Notifications Sent:'.padEnd(30)} ${runStats.eventsEmailed}${colors.reset}\n`
  if (runStats.errors?.length > 0) {
    section += `  ${colors.red}${'Errors Encountered:'.padEnd(30)} ${runStats.errors.length}${colors.reset}\n`
  }
  section += `  ${colors.yellow}${'Overall Signal/Noise Ratio:'.padEnd(30)} ${signalToNoiseRatio}${colors.reset}\n`
  section += formatJudgeVerdictSummary(runStats.judgeVerdict)
  return section
}

export function formatTopEvents(runStats) {
  if (
    !runStats.synthesizedEventsForReport ||
    runStats.synthesizedEventsForReport.length === 0
  )
    return ''
  let section = `  ${colors.yellow}--- Top Synthesized Events (This Run) ---${colors.reset}\n`
  runStats.synthesizedEventsForReport.slice(0, 5).forEach((event) => {
    section += `  ${colors.green}[${String(event.highest_relevance_score).padStart(3)}]${colors.reset} "${truncateString(event.synthesized_headline, 70)}"\n`
  })
  return section + '\n'
}

export function formatTokenUsage(runStats) {
  if (!runStats.tokenUsage) return ''
  let section = `  ${colors.yellow}--- Token Usage & Cost (Estimate) ---${colors.reset}\n`
  let totalCost = 0
  const usage = runStats.tokenUsage
  const modelsWithUsage = Object.keys(usage).filter(
    (model) => usage[model].inputTokens > 0 || usage[model].outputTokens > 0
  )
  if (modelsWithUsage.length === 0) {
    section += `  No token usage recorded for this run.\n`
    return section
  }
  modelsWithUsage.forEach((model) => {
    const stats = usage[model]
    section += `  ${`Model: ${model}`.padEnd(40)}\n`
    section += `  ${'  Input Tokens:'.padEnd(25)} ${stats.inputTokens.toLocaleString()}\n`
    section += `  ${'  Output Tokens:'.padEnd(25)} ${stats.outputTokens.toLocaleString()}\n`
    section += `  ${'  Est. Cost:'.padEnd(25)} $${stats.cost.toFixed(4)}\n`
    totalCost += stats.cost
  })
  section += `  ------------------------------------------------\n`
  section += `  ${colors.green}${'Total Estimated Cost:'.padEnd(25)} $${totalCost.toFixed(4)}${colors.reset}\n`
  return section + '\n'
}

export function formatApiUsage(runStats) {
  if (!runStats.apiCalls) return ''
  let section = `  ${colors.yellow}--- Third-Party API Usage (Estimate) ---${colors.reset}\n`
  let totalCost = 0
  const usage = runStats.apiCalls
  const servicesWithUsage = Object.keys(usage).filter(
    (service) => usage[service].calls > 0
  )
  if (servicesWithUsage.length === 0) {
    section += `  No third-party API calls recorded for this run.\n`
    return section
  }
  servicesWithUsage.forEach((service) => {
    const stats = usage[service]
    const costString = stats.cost > 0 ? `$${stats.cost.toFixed(4)}` : '(Free)'
    section += `  ${`${service}:`.padEnd(25)} ${`${stats.calls.toLocaleString()} calls`.padEnd(15)} ${costString}\n`
    totalCost += stats.cost
  })
  section += `  ------------------------------------------------\n`
  section += `  ${colors.green}${'Total Estimated Cost:'.padEnd(25)} $${totalCost.toFixed(4)}${colors.reset}\n`
  return section + '\n'
}

export function formatContentScrapingFailures(runStats) {
  const failures = runStats.enrichmentOutcomes || []
  const contentFailures = failures.filter(
    (f) => (f.assessment_article || '').includes('Enrichment Failed')
  )
  if (contentFailures.length === 0) return ''

  let section = `${colors.magenta}  --- Content Scrape Failures (This Run) ---${colors.reset}\n`
  contentFailures.slice(0, 5).forEach((f) => {
    section += `    ${f.headline}\n`
  })
  if (contentFailures.length > 5) {
    section += `    ... and ${contentFailures.length - 5} more\n`
  }
  section += '\n'
  return section
}

export function formatPreDealSignals(runStats) {
  const signals = runStats.preDealSignals || []
  if (signals.length === 0) return ''

  let section = `${colors.magenta}  --- Pre-Deal Signals Detected ---${colors.reset}\n`
  signals.forEach((s) => {
    section += `  \x1b[33m⚠ ${s.headline?.substring(0, 60)}\x1b[0m\n`
    s.signals.forEach(sig => {
      section += `      → ${sig.signal}\n`
    })
  })
  section += '\n'
  return section
}

export function formatTransactionScores(runStats) {
  const scores = runStats.transactionScores || []
  if (scores.length === 0) return ''

  scores.sort((a, b) => b.score - a.score)
  const top = scores.slice(0, 10)

  let section = `${colors.magenta}  --- Transaction Readiness Scores ---${colors.reset}\n`
  top.forEach((s) => {
    const color = s.score >= 60 ? '\x1b[32m' : s.score >= 40 ? '\x1b[33m' : '\x1b[90m'
    section += `  ${color}[${String(s.score).padStart(3)}]\x1b[0m ${s.name?.substring(0, 30).padEnd(32)} | ${s.events?.[0]?.readiness || 'cold'}\n`
  })
  section += '\n'
  return section
}

export function formatIntelligenceSummary(runStats) {
  let section = `  ${colors.yellow}--- 🧠 Intelligence Enrichment Summary ---${colors.reset}\n`
  const filings = runStats.filingsFound
  const fos = runStats.familyOfficesDiscovered
  const advisors = runStats.dealAdvisorsFound
  const wealth = runStats.wealthChainsResolved
  const sentiment = runStats.sentimentUpdated
  if (!filings && !fos && !advisors && !wealth && !sentiment) return ''
  if (filings) section += `  ${'Regulatory Filings:'.padEnd(30)} ${colors.cyan}${filings}${colors.reset}\n`
  if (fos) section += `  ${'Family Offices Found:'.padEnd(30)} ${colors.green}${fos}${colors.reset}\n`
  if (advisors) section += `  ${'Deal Advisors Found:'.padEnd(30)} ${colors.magenta}${advisors}${colors.reset}\n`
  if (wealth) section += `  ${'Wealth Chains Resolved:'.padEnd(30)} ${colors.green}${wealth}${colors.reset}\n`
  if (sentiment) section += `  ${'Sentiment Scores Updated:'.padEnd(30)} ${colors.cyan}${sentiment}${colors.reset}\n`
  return section + '\n'
}

export async function formatStrugglingSources(runStats, dbStats) {
  const headlineFailures = (runStats.scraperHealth || []).filter((h) => !h.success)
  const strugglingSources = new Map()
  headlineFailures.forEach((failure) => {
    strugglingSources.set(
      failure.source,
      'Scraped 0 headlines (Immediate Action Required)'
    )
  })
  let section = `  ${colors.magenta}Actionable Source Health Alerts:${colors.reset}\n`
  if (strugglingSources.size > 0) {
    strugglingSources.forEach((reason, sourceName) => {
      section += `  ${colors.red}${`- ${truncateSourceName(sourceName)}:`.padEnd(25)}${reason}${colors.reset}\n`
    })
  } else {
    section += `  ${colors.green}  All sources are performing within expected parameters.${colors.reset}\n`
  }
  return section + '\n'
}
