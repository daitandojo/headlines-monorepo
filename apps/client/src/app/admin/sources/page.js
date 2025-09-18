// apps/client/src/app/admin/sources/page.js (version 2.0 - Restored & Pathed)
'use server'

// DEFINITIVE FIX: Imports now point to the correct monorepo packages
import { getAllSources, getGlobalCountries } from '@headlines/data-access'
import { SourceManagementClient } from '@/components/admin/sources/SourceManagementClient'

export const metadata = {
  title: 'Source Management | Admin',
}

export default async function SourceManagementPage() {
  const [sourcesResult, countriesResult] = await Promise.all([
    getAllSources(),
    getGlobalCountries(),
  ])

  if (!sourcesResult.success) {
    return (
      <div className="text-center py-10">
        <h1 className="text-xl font-bold text-red-400">Access Denied</h1>
        <p className="text-slate-400">
          {sourcesResult.error || 'Could not load sources.'}
        </p>
      </div>
    )
  }

  return (
    <SourceManagementClient
      initialSources={sourcesResult.data}
      allCountries={(countriesResult.data || []).map((c) => c.name)}
    />
  )
}