// apps/pipeline/src/modules/email/components/supervisor/costSummary.js (version 2.0.0)
import { escapeHtml } from '@headlines/utils-shared'

function formatCost(cost) {
  return `$${cost.toFixed(4)}`
}

export function createCostSummaryHtml(runStats) {
  if (!runStats || (!runStats.tokenUsage && !runStats.apiCalls)) {
    return ''
  }

  let totalTokenCost = 0
  let totalApiCost = 0
  let tokenHtml = ''
  let apiHtml = ''

  if (runStats.tokenUsage) {
    const modelsWithUsage = Object.keys(runStats.tokenUsage).filter(
      (model) =>
        runStats.tokenUsage[model].inputTokens > 0 ||
        runStats.tokenUsage[model].outputTokens > 0
    )
    if (modelsWithUsage.length > 0) {
      const tokenRows = modelsWithUsage
        .map((model) => {
          const stats = runStats.tokenUsage[model]
          totalTokenCost += stats.cost
          return `
            <tr>
                <td>${escapeHtml(model)}</td>
                <td>${stats.inputTokens.toLocaleString()}</td>
                <td>${stats.outputTokens.toLocaleString()}</td>
                <td>${formatCost(stats.cost)}</td>
            </tr>`
        })
        .join('')
      tokenHtml = `
        <h3>LLM Token Usage</h3>
        <table>
            <thead><tr><th>Model</th><th>Input Tokens</th><th>Output Tokens</th><th>Est. Cost</th></tr></thead>
            <tbody>${tokenRows}</tbody>
        </table>`
    }
  }

  if (runStats.apiCalls) {
    const servicesWithUsage = Object.keys(runStats.apiCalls).filter(
      (service) => runStats.apiCalls[service].calls > 0
    )
    if (servicesWithUsage.length > 0) {
      const apiRows = servicesWithUsage
        .map((service) => {
          const stats = runStats.apiCalls[service]
          totalApiCost += stats.cost
          return `
            <tr>
                <td>${escapeHtml(service)}</td>
                <td>${stats.calls.toLocaleString()}</td>
                <td>${stats.cost > 0 ? formatCost(stats.cost) : '(Free)'}</td>
            </tr>`
        })
        .join('')
      apiHtml = `
        <h3 style="margin-top: 30px;">Third-Party API Usage</h3>
        <table>
            <thead><tr><th>Service</th><th>Calls</th><th>Est. Cost</th></tr></thead>
            <tbody>${apiRows}</tbody>
        </table>`
    }
  }

  const grandTotalCost = totalTokenCost + totalApiCost

  return `
    <h2>Cost Summary</h2>
    ${tokenHtml}
    ${apiHtml}
    <p style="text-align: right; font-size: 16px; font-weight: bold; margin-top: 20px;">
        Total Estimated Run Cost: <span style="color: #0056b3;">${formatCost(
          grandTotalCost
        )}</span>
    </p>`
}
