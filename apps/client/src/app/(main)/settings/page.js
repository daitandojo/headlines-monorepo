// src/app/(main)/settings/page.js (version 2.0)
import { useAuth } from '@/hooks/useAuth'
import { getGlobalCountries } from '@/actions/countries'
import { SettingsForm } from '@/components/SettingsForm'

// Note: We cannot use the useAuth hook here as this is a Server Component.
// The client component below it will handle user-specific rendering.

export default async function SettingsPage() {
  const allCountries = await getGlobalCountries()

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-lg text-slate-300 mt-1">
          This is where you will manage your profile and preferences.
        </p>
      </div>
      <SettingsForm allCountries={allCountries} />
    </div>
  )
}
