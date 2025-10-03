// scripts/tools/get-db-stats.js
import { initializeScriptEnv } from '../seed/lib/script-init.js'
import { getDashboardStats } from '@headlines/data-access'

async function getStats() {
  await initializeScriptEnv()
  try {
    console.log('\n--- 📊 Database Statistics ---')
    const statsResult = await getDashboardStats()
    if (!statsResult.success) throw new Error(statsResult.error)

    const stats = statsResult.data

    console.table({
      'Active Sources': `${stats.sources.active} / ${stats.sources.total}`,
      'Active Watchlist Entities': stats.watchlist.total,
      'Total Articles': stats.articles.total.toLocaleString(),
      'Total Synthesized Events': stats.events.total.toLocaleString(),
      'Total Opportunities': stats.opportunities.total.toLocaleString(),
      'Active Subscribers': `${stats.users.active} / ${stats.users.total}`,
    })
  } catch (error) {
    console.error('Failed to fetch database stats:', error)
  }
}

getStats()
