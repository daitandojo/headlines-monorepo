// apps/client/src/app/(protected)/settings/page.js (NEW FILE)
import { getGlobalCountries } from '@headlines/data-access'
import { SettingsForm } from '@/components/SettingsForm'

export default async function SettingsPage() {
  const { data: allCountries } = await getGlobalCountries()

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
