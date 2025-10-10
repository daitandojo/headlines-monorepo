// File: apps/client/src/app/(client)/settings/page.js (CORRECTED)
import { SettingsForm } from '@/components/client/settings/SettingsForm'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  let allCountries = []

  try {
    // ✅ Fetch through the admin API route instead of a direct data-access call
    const url = new URL(
      '/api-admin/countries',
      process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    )

    const response = await fetch(url.toString(), {
      headers: {
        cookie: cookies().toString(), // Forward cookies for authentication
      },
    })

    if (response.ok) {
      const result = await response.json()
      if (result.success) {
        allCountries = result.data
      }
    } else {
      console.error(
        '[SettingsPage] API responded with an error:',
        response.status,
        await response.text()
      )
    }
  } catch (err) {
    console.error('[SettingsPage] Failed to fetch countries data:', err.message)
    // The component will proceed with an empty `allCountries` array, which the UI can handle.
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-lg text-slate-300 mt-1">
          Manage your profile and notification preferences.
        </p>
      </div>
      <SettingsForm allCountries={allCountries} />
    </div>
  )
}
