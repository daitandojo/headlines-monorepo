// apps/client/src/app/(client)/settings/page.js
import { SettingsForm } from '@/components/client/settings/SettingsForm'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// Define the canonical list of sectors available for subscription
const allSectors = [
  'Technology',
  'Healthcare',
  'Industrials',
  'Real Estate',
  'Consumer Goods',
  'Financial Services',
  'Energy',
  'Logistics',
  'M&A',
  'IPO',
  'Succession',
].sort()

export default async function SettingsPage() {
  let allCountries = []

  try {
    const url = new URL(
      '/api-admin/countries',
      process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    )

    const response = await fetch(url.toString(), {
      headers: {
        cookie: cookies().toString(),
      },
    })

    if (response.ok) {
      const result = await response.json()
      if (result.success) {
        // Pass both name and count for the UI
        allCountries = result.data.map((c) => ({ name: c.name, count: c.eventCount }))
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
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-lg text-slate-300 mt-1">
          Manage your profile, feed preferences, and notification settings.
        </p>
      </div>
      <SettingsForm allCountries={allCountries} allSectors={allSectors} />
    </div>
  )
}
