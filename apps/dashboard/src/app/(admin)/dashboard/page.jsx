// apps/admin/src/app/(protected)/dashboard/page.jsx (version 3.0.1)
import {
  getDashboardStats,
  getRecentRunVerdicts,
  getAllSources,
} from '@headlines/data-access'
import DashboardClientPage from './DashboardClientPage'

export const dynamic = 'force-dynamic'

async function getPageData() {
  try {
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
    console.error('[Dashboard Server Error]', error)
    return { stats: null, runs: [], sources: [], error: error.message }
  }
}

export default async function DashboardPage() {
  const { stats, runs, sources, error } = await getPageData()

  if (error) {
    return (
      <div className="text-red-500 text-center p-8">
        Error loading dashboard data: {error}
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
