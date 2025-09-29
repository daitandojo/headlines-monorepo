// File: apps/client/src/app/admin/dashboard/page.jsx (version 2.5 - FINAL)
// 'use server'

import {
  getDashboardStats,
  getRecentRunVerdicts,
  getAllSources,
} from '@headlines/data-access'
import DashboardClientPage from './DashboardClientPage'
// The explicit initializer is no longer needed.

export const dynamic = 'force-dynamic'

async function getPageData() {
  try {
    // The data-access functions now reliably handle their own connections.
    const [statsResult, verdictsResult, sourcesResult] = await Promise.all([
      getDashboardStats(),
      getRecentRunVerdicts(),
      getAllSources(),
    ])

    return {
      stats: statsResult.data || null,
      runs: verdictsResult.data || [],
      sources: sourcesResult.data || [],
      error: null,
    }
  } catch (error) {
    console.error('[Admin Dashboard Server Error]', error)
    return { stats: null, runs: [], sources: [], error: error.message }
  }
}

export default async function AdminDashboardPage() {
  const { stats, runs, sources, error } = await getPageData()

  if (error) {
    return (
      <div className="p-8 text-center text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg">
        <h2 className="text-xl font-bold">Error Loading Dashboard Data</h2>
        <p className="mt-2">{error}</p>
      </div>
    )
  }

  return (
    <DashboardClientPage
      initialStats={stats}
      initialRuns={runs}
      initialSources={sources}
    />
  )
}
