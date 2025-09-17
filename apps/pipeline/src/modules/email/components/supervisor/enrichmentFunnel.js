// apps/pipeline/src/modules/email/components/supervisor/enrichmentFunnel.js (version 2.1.0)
import { settings } from '@headlines/config/src/server.js'
import { escapeHtml, truncateString } from '@headlines/utils/src/server.js'

export function createEnrichmentFunnelHtml(runStats) {
  const enrichmentOutcomes = runStats.enrichmentOutcomes || []

  if (runStats.relevantHeadlines === 0) {
    return `<h2>Enrichment Funnel</h2><p>No headlines met the relevance threshold (scored &lt; ${settings.HEADLINES_RELEVANCE_THRESHOLD}).</p>`
  }

  const cardsHtml = enrichmentOutcomes
    .sort((a, b) => (b.headlineScore || 0) - (a.headlineScore || 0))
    .map((item) => {
      const isSuccess = item.outcome.toLowerCase() === 'success'
      const statusClass = isSuccess
        ? 'status-success'
        : item.outcome === 'High-Signal Failure'
          ? 'status-failure'
          : 'status-dropped'
      const statusIcon = isSuccess ? '✅' : '❌'

      let finalScoreText = `Final Score [${item.finalScore ?? 'N/A'}]`
      if (item.agent_disagreement) {
        finalScoreText += ` <strong style="color: #d97706;">(Disagreement)</strong>`
      }

      // DEFINITIVE FIX: Use the actual assessment text and content snippets
      const headlineAssessment = item.assessment_headline || 'N/A';
      const articleAssessment = item.assessment_article || 'N/A';
      const contentSnippet = item.content_snippet ? `${escapeHtml(item.content_snippet)}...` : 'N/A';

      return `
        <div class="card">
            <div class="card-header">
                <h4 style="margin:0; font-size: 16px;">
                    <a href="${item.link}" target="_blank">${escapeHtml(item.headline)}</a>
                </h4>
                <p style="margin: 5px 0 0; font-size: 12px; color: #6c757d;">Source: ${escapeHtml(item.newspaper)}</p>
            </div>
            <div class="card-body">
                <p style="margin: 0 0 10px;"><strong>${statusIcon} Final Outcome:</strong> <span class="${statusClass}">${item.outcome}</span></p>
                <div class="step">
                    <p class="step-title"><strong>Stage 1: Headline Assessment</strong></p>
                    <p class="step-detail">Score [${item.headlineScore}] - <i>${escapeHtml(truncateString(headlineAssessment, 150))}</i></p>
                </div>
                <div class="step">
                    <p class="step-title"><strong>Stage 2: Content Enrichment & Assessment</strong></p>
                    <p class="step-detail">${finalScoreText} - <i>${escapeHtml(truncateString(articleAssessment, 200))}</i></p>
                </div>
                <div class="snippet">
                    <strong>Article Snippet:</strong>
                    <p class="snippet-text">${contentSnippet}</p>
                </div>
            </div>
        </div>`
    })
    .join('')
  return `<h2>Enrichment Funnel Audit Trail (Lifecycle of ${runStats.relevantHeadlines} relevant headlines)</h2>${cardsHtml}`
}
