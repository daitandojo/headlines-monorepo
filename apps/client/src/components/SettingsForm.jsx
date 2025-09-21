// apps/client/src/components/SettingsForm.jsx (version 2.0.0)
'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@headlines/auth'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
  Button,
  Label,
} from '@headlines/ui'
import { CountrySubscriptionEditor } from './CountrySubscriptionEditor'
import { Save, Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { clearDiscardedItems } from '@/lib/api-client'

export function SettingsForm({ allCountries }) {
  const { user, updateUserPreferences } = useAuth()
  const [formData, setFormData] = useState({ countries: [] })
  const [isSaving, setIsSaving] = useState(false)
  const [isClearing, setIsClearing] = useState(false)

  useEffect(() => {
    if (user) {
      setFormData({
        countries: (user.countries || []).map((c) => c.name).filter(Boolean),
      })
    }
  }, [user])

  const handleCountryChange = (newCountryNames) => {
    setFormData((prev) => ({ ...prev, countries: newCountryNames }))
  }

  const handleSaveChanges = async (e) => {
    e.preventDefault()
    setIsSaving(true)
    const newSubscriptions = formData.countries.map((name) => ({ name, active: true }))
    await updateUserPreferences({ countries: newSubscriptions })
    setIsSaving(false)
  }

  const handleClearDiscarded = async () => {
    toast.info('Clearing discarded items...')
    setIsClearing(true)
    const result = await clearDiscardedItems()
    if (result.success) {
      toast.success('Discarded items cleared. Your feeds will be refreshed.')
    } else {
      toast.error('Failed to clear items', { description: result.error })
    }
    setIsClearing(false)
  }

  if (!user) return null

  return (
    <>
      <form onSubmit={handleSaveChanges}>
        <Card className="bg-slate-900/50 border-slate-700/80">
          <CardHeader>
            <CardTitle>Country Subscriptions</CardTitle>
            <CardDescription>
              Select the countries you want to receive intelligence from.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Label>Subscribed Countries</Label>
            <CountrySubscriptionEditor
              allCountries={allCountries}
              selectedCountries={formData.countries}
              onSelectionChange={handleCountryChange}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Preferences
            </Button>
          </CardFooter>
        </Card>
      </form>
      <Card className="mt-8 bg-slate-900/50 border-red-500/30">
        <CardHeader>
          <CardTitle>Danger Zone</CardTitle>
          <CardDescription>
            These actions are irreversible. Proceed with caution.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <div>
              <p className="font-semibold">Reset Discarded Items</p>
              <p className="text-sm text-slate-400">
                If you've dismissed items by swiping, this will make them visible again in
                your feeds.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={handleClearDiscarded}
              disabled={isClearing}
            >
              {isClearing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Clear Discarded
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
