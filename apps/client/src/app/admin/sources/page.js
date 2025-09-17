// src/app/admin/sources/page.js (version 1.0)
import { getAllSources } from '@/actions/adminSources'
import { SourceManagementClient } from '@/components/admin/sources/SourceManagementClient'
import { getGlobalCountries } from '@/actions/countries'

export const metadata = {
  title: 'Source Management | Admin',
}

export default async function SourceManagementPage() {
  const [sourcesResult, countries] = await Promise.all([
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
      allCountries={countries.map((c) => c.name)}
    />
  )
}
