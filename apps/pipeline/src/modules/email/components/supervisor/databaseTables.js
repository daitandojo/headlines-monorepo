// apps/pipeline/src/modules/email/components/supervisor/databaseTables.js (Corrected)
import { SynthesizedEvent } from '@headlines/models'
import { settings } from '@headlines/config'
import { truncateString, escapeHtml } from '@headlines/utils-shared' // <-- CORRECTED IMPORT

const sourceIcons = {
  // ... rest of the file is unchanged ...
  rag_db: '🗄️',
  wikipedia: '🌐',
  news_api: '📰',
}

function formatEnrichmentSources(sources = []) {
  if (sources.length === 0) return 'N/A'
  return sources.map((s) => sourceIcons[s] || '❓').join(' ')
}

export async function createEventsTableHtml(runStartDate) {
  const recentEvents = await SynthesizedEvent.find({ createdAt: { $gte: runStartDate } })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean()
  if (recentEvents.length === 0)
    return `<h2>Synthesized Events from this Run</h2><p>No events were synthesized in this run.</p>`
  let tableRows = recentEvents
    .map(
      (event) =>
        `<tr>
            <td>${truncateString(escapeHtml(event.synthesized_headline), 70)}</td>
            <td>${event.highest_relevance_score}</td>
            <td>${formatEnrichmentSources(event.enrichmentSources)}</td>
            <td>${escapeHtml((event.key_individuals || []).map((p) => p.name).join(', ') || 'N/A')}</td>
            <td>${event.emailed ? 'Yes' : 'No'}</td>
        </tr>`
    )
    .join('')
  return `<h2>Synthesized Events (${recentEvents.length})</h2>
    <table>
        <thead><tr><th>Synthesized Headline</th><th>Score</th><th>Enrichment</th><th>Key Individuals</th><th>Emailed?</th></tr></thead>
        <tbody>${tableRows}</tbody>
    </table>`
}

export async function createArticlesTableHtml(runStats) {
  // DEFINITIVE FIX: Use enrichmentOutcomes as the source of truth
  const allArticles = runStats.enrichmentOutcomes || []

  if (allArticles.length === 0)
    return `<h2>All Fresh Articles Processed</h2><p>No new raw articles were processed in the enrichment stage.</p>`

  const relevantArticles = allArticles.filter(
    (a) => a.headlineScore >= settings.HEADLINES_RELEVANCE_THRESHOLD
  )
  const irrelevantCount = runStats.freshHeadlinesFound - relevantArticles.length

  if (relevantArticles.length === 0) {
    return `<h2>All Fresh Articles Processed (${runStats.freshHeadlinesFound})</h2><p>No headlines were deemed relevant (all scored < ${settings.HEADLINES_RELEVANCE_THRESHOLD}).</p>`
  }

  relevantArticles.sort(
    (a, b) => (b.finalScore || b.headlineScore) - (a.finalScore || a.headlineScore)
  )

  let tableRows = relevantArticles
    .map((article) => {
      const status = article.outcome
      const finalScore = article.finalScore ?? 'N/A'
      return `<tr><td><a href="${article.link}" target="_blank">${truncateString(escapeHtml(article.headline), 80)}</a></td><td>${escapeHtml(article.newspaper)}</td><td>${article.headlineScore}</td><td>${finalScore}</td><td>${status}</td></tr>`
    })
    .join('')

  let footer = ''
  if (irrelevantCount > 0) {
    footer = `<p style="margin-top: 15px; font-size: 13px; color: #6c757d;">... plus ${irrelevantCount} other headlines that were deemed irrelevant (score < ${settings.HEADLINES_RELEVANCE_THRESHOLD}).</p>`
  }

  return `<h2>All Fresh Articles Processed (${runStats.freshHeadlinesFound})</h2>
    <table>
        <thead><tr><th>Headline</th><th>Source</th><th>HL Score</th><th>Final Score</th><th>Enrichment Status</th></tr></thead>
        <tbody>${tableRows}</tbody>
    </table>
    ${footer}`
}
