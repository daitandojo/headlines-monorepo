// File: apps/copyboard/src/app/(client)/settings/page.js

// 'use server'

import { getGlobalCountries } from '@headlines/data-access/next'
import { SettingsForm } from '@/components/client/SettingsForm'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  // Fetch all countries with event counts to pass to the editor
  const { data: allCountries } = await getGlobalCountries()

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-lg text-slate-300 mt-1">
          Manage your profile and notification preferences.
        </p>
      </div>
      <SettingsForm allCountries={allCountries || []} />
    </div>
  )
}
