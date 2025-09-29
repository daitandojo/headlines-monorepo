// apps/pipeline/src/modules/email/components/supervisor/judgeVerdict.js (version 2.0.0)
import { escapeHtml } from '@headlines/utils-shared'

function getVerdictClass(quality) {
  if (!quality) return 'verdict-neutral'
  const q = quality.toLowerCase()
  if (q === 'excellent' || q === 'good') {
    return 'verdict-positive'
  }
  if (q === 'poor' || q === 'irrelevant') {
    return 'verdict-negative'
  }
  return 'verdict-neutral' // For Acceptable, Marginal
}

export function createJudgeVerdictHtml(judgeVerdict) {
  if (!judgeVerdict) return ''

  let html = '<h2>⚖️ Judge & Arbitrator Verdict</h2>'
  html +=
    '<p>The following is a quality control review of the items generated in this run, intended to provide feedback for prompt engineering and system improvements.</p>'

  const renderJudgements = (judgements) => {
    let content = ''
    if (judgements && judgements.length > 0) {
      judgements.forEach((item) => {
        const verdictClass = getVerdictClass(item.quality)
        content += `
            <div class="card">
                <div class="card-header"><h4 style="margin:0; font-size: 15px;">${escapeHtml(item.identifier)}</h4></div>
                <div class="card-body">
                    <p class="judge-verdict" style="margin:0;">
                        <strong class="${verdictClass}">[${escapeHtml(item.quality)}]</strong> 
                        ${escapeHtml(item.commentary)}
                    </p>
                </div>
            </div>`
      })
    }
    return content
  }

  html += '<h3>Event Judgements</h3>'
  html += renderJudgements(judgeVerdict.event_judgements) || '<p>No events to judge.</p>'

  html += '<h3 style="margin-top: 30px;">Opportunity Judgements</h3>'
  html +=
    renderJudgements(judgeVerdict.opportunity_judgements) ||
    '<p>No opportunities to judge.</p>'

  return html
}
