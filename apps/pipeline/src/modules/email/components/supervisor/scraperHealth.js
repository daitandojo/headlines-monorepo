// apps/pipeline/src/modules/email/components/supervisor/scraperHealth.js (Corrected)
import { escapeHtml } from '@headlines/utils-shared'

export function createScraperFailureAlertHtml(enrichmentOutcomes) {
  if (!enrichmentOutcomes || enrichmentOutcomes.length === 0) return ''

  // Filter for high-signal headlines where content scraping failed.
  const scraperFailures = enrichmentOutcomes.filter(
    (item) =>
      item.outcome === 'High-Signal Failure' ||
      (item.outcome === 'Dropped' &&
        // DEFENSIVE FIX: Check for assessment_article existence before calling .includes()
        (item.assessment_article || '').includes('Enrichment Failed'))
  )

  if (scraperFailures.length === 0) return ''

  let listItems = scraperFailures
    .map((item) => {
      // Differentiate the reason in the email for clarity.
      const reason =
        item.outcome === 'High-Signal Failure'
          ? 'High-Signal Headline - Content Scraping Failed'
          : item.assessment_article

      return `
        <li style="margin-bottom: 12px;">
            <strong>${escapeHtml(item.newspaper)}:</strong> 
            <a href="${item.link}" target="_blank">${escapeHtml(item.headline)}</a><br>
            <em style="font-size:13px; color: #555;">${escapeHtml(reason)}</em>
        </li>`
    })
    .join('')

  return `
    <div class="alert-box alert-danger">
        <h2 style="margin-top:0;">⚠️ Scraper Action Required</h2>
        <p>The following relevant headlines failed the enrichment stage, likely due to an outdated or incorrect article text selector.</p>
        <ul style="padding-left: 20px; margin-top: 15px; font-size: 14px;">${listItems}</ul>
    </div>`
}

export function createScraperHealthTable(healthStats) {
  if (!healthStats || healthStats.length === 0)
    return '<h2>Scraper Health Check</h2><p>No health stats available.</p>'
  let tableRows = healthStats
    .sort((a, b) => a.source.localeCompare(b.source))
    .map((stat) => {
      const status = stat.success ? '✅ OK' : '❌ FAILED'
      const statusColor = stat.success ? '#28a745' : '#dc3545'
      return `
            <tr>
                <td>${escapeHtml(stat.source)}</td>
                <td style="color: ${statusColor}; font-weight: bold;">${status}</td>
                <td>${stat.count}</td>
            </tr>`
    })
    .join('')
  return `
    <h2>Scraper Health Check</h2>
    <table>
        <thead><tr><th>Source</th><th>Status</th><th>Articles Found</th></tr></thead>
        <tbody>${tableRows}</tbody>
    </table>`
}
