// apps/pipeline/src/modules/email/components/supervisor/supervisorEmailBodyBuilder.js (version 5.2.2 - Path Fix)
import { SUPERVISOR_EMAIL_CONFIG } from '@headlines/config'
import { createSupervisorEmailWrapper } from '../../templates/supervisorWrapper.js'
import {
  createScraperHealthTable,
  createScraperFailureAlertHtml,
} from './scraperHealth.js'
import { createEnrichmentFunnelHtml } from './enrichmentFunnel.js'
import { createEventsTableHtml, createArticlesTableHtml } from './databaseTables.js'
import { createJudgeVerdictHtml } from './judgeVerdict.js'
import { createCostSummaryHtml } from './costSummary.js'
import { SynthesizedEvent, Opportunity } from '@headlines/models'
import { executiveSummaryChain } from '@headlines/ai-services'
import { logger } from '@headlines/utils-shared'

function createPerformanceDashboardHtml(runStats, newEventCount, newOpportunityCount) {
  const funnel = `${runStats.headlinesScraped} Scraped ➔ ${runStats.relevantHeadlines} Relevant ➔ ${runStats.eventsSynthesized} Events ➔ ${newOpportunityCount} Opps`
  const totalCost =
    (runStats.tokenUsage
      ? Object.values(runStats.tokenUsage).reduce((acc, model) => acc + model.cost, 0)
      : 0) +
    (runStats.apiCalls
      ? Object.values(runStats.apiCalls).reduce((acc, service) => acc + service.cost, 0)
      : 0)

  return `
        <h2>Performance Dashboard</h2>
        <table class="dashboard">
            <tr>
                <th>Funnel</th>
                <td>${funnel}</td>
            </tr>
            <tr>
                <th>New Events Created</th>
                <td>${newEventCount}</td>
            </tr>
            <tr>
                <th>Est. Run Cost</th>
                <td>$${totalCost.toFixed(4)}</td>
            </tr>
             <tr>
                <th>Errors</th>
                <td style="color: ${runStats.errors?.length > 0 ? '#dc3545' : '#28a745'}; font-weight: bold;">${runStats.errors?.length || 0}</td>
            </tr>
        </table>
    `
}

export async function createSupervisorEmailBody(runStats) {
  const runTimestamp = new Date().toLocaleString('en-GB', {
    timeZone: 'Europe/Copenhagen',
  })
  const runStartDate = new Date(Date.now() - 20 * 60 * 1000)

  const [newEventCount, newOpportunityCount] = await Promise.all([
    SynthesizedEvent.countDocuments({ createdAt: { $gte: runStartDate } }),
    Opportunity.countDocuments({ createdAt: { $gte: runStartDate } }),
  ])

  const executiveSummaryPayload = {
    freshHeadlinesFound: runStats.freshHeadlinesFound,
    judgeVerdict: runStats.judgeVerdict || {
      event_judgements: [],
      opportunity_judgements: [],
    },
  }

  const executiveSummaryResult = await executiveSummaryChain({
    payload_json_string: JSON.stringify(executiveSummaryPayload),
  })
  const executiveSummary =
    executiveSummaryResult.summary || 'AI failed to generate a summary for this run.'

  const scraperFailureAlertHtml = createScraperFailureAlertHtml(
    runStats.enrichmentOutcomes
  )

  const executiveSummaryHtml = executiveSummary
    ? `<div class="alert-box alert-info">
          <h2 style="margin-top:0;">🤖 Executive Summary</h2>
          <p style="font-style: italic; font-size: 15px;">"${executiveSummary}"</p>
      </div>`
    : ''

  const dashboardHtml = createPerformanceDashboardHtml(
    runStats,
    newEventCount,
    newOpportunityCount
  )

  const [
    scraperHealthHtml,
    enrichmentFunnelHtml,
    judgeVerdictHtml,
    eventsTableHtml,
    articlesTableHtml,
    costSummaryHtml,
  ] = await Promise.all([
    createScraperHealthTable(runStats.scraperHealth),
    createEnrichmentFunnelHtml(runStats),
    createJudgeVerdictHtml(runStats.judgeVerdict),
    createEventsTableHtml(runStartDate),
    createArticlesTableHtml(runStats),
    createCostSummaryHtml(runStats),
  ])

  const bodyContent = `
        <div style="text-align:center; margin-bottom: 30px;">
            <h1>${SUPERVISOR_EMAIL_CONFIG.subject}</h1>
            <p style="font-size: 16px; color: #6c757d;">Run completed: ${runTimestamp}</p>
        </div>
        
        <!-- BLUF SECTION -->
        ${executiveSummaryHtml}
        ${scraperFailureAlertHtml} 
        ${dashboardHtml}
        ${costSummaryHtml}

        <!-- APPENDICES -->
        <div class="appendix-section">
            ${judgeVerdictHtml}
            ${enrichmentFunnelHtml}
            ${eventsTableHtml}
            ${articlesTableHtml}
            ${scraperHealthHtml}
        </div>

        <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 12px; color: #6c757d;">
            <p>This is an automated report from the ${SUPERVISOR_EMAIL_CONFIG.brandName}.</p>
        </div>`

  return createSupervisorEmailWrapper(bodyContent, SUPERVISOR_EMAIL_CONFIG.subject)
}
