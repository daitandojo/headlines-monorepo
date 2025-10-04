// File: apps/client/src/app/admin/dashboard/page.jsx (CORRECTED)
import {
  getDashboardStats,
  getRecentRunVerdicts,
  getAllSources,
} from '@headlines/data-access/next'
import DashboardClientPage from './DashboardClientPage'
import dbConnect from '@headlines/data-access/dbConnect/next'

export const dynamic = 'force-dynamic'

async function getPageData() {
  try {
    const [statsResult, verdictsResult, sourcesResult] = await Promise.all([
      getDashboardStats(),
      getRecentRunVerdicts(),
      getAllSources({}),
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
  await dbConnect() // ACTION: Add this line
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
