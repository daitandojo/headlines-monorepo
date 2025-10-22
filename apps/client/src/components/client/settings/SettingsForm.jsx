// apps/client/src/components/client/settings/SettingsForm.jsx
'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/client.js'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
  Button,
  Label,
  Input,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/shared'
import { CountrySubscriptionEditor } from '../countries/CountrySubscriptionEditor'
import { SectorSubscriptionEditor } from './SectorSubscriptionEditor'
import {
  Save,
  Loader2,
  Trash2,
  User,
  Settings as SettingsIcon,
  Filter,
} from 'lucide-react'
import { toast } from 'sonner'

async function clearDiscardedItems() {
  const res = await fetch('/api/user/settings/clear-discarded', { method: 'POST' })
  if (!res.ok) {
    const errorData = await res.json()
    throw new Error(errorData.error || 'Failed to clear items')
  }
  return res.json()
}

export function SettingsForm({ allCountries, allSectors }) {
  const { user, updateUserPreferences } = useAuth()
  const router = useRouter()
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    countries: [],
    sectors: [],
  })
  const [isSaving, setIsSaving] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const tabsListRef = useRef(null)
  const [contentWidth, setContentWidth] = useState(0)

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        password: '',
        confirmPassword: '',
        countries: (user.countries || []).map((c) => c.name),
        sectors: user.sectors || [],
      })
    }
  }, [user])

  useEffect(() => {
    const handleResize = () => {
      if (tabsListRef.current) {
        setContentWidth(tabsListRef.current.offsetWidth)
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleChange = (e) => {
    const { id, value } = e.target
    setFormData((prev) => ({ ...prev, [id]: value }))
  }

  const handleSaveChanges = async (e) => {
    e.preventDefault()
    if (formData.password && formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match.')
      return
    }

    setIsSaving(true)

    // MODIFIED: Include sectors and correctly format countries for the API
    const updateData = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      countries: formData.countries.map((name) => ({ name, active: true })),
      sectors: formData.sectors,
    }
    if (formData.password) {
      updateData.password = formData.password
    }

    await updateUserPreferences(updateData)
    setFormData((prev) => ({ ...prev, password: '', confirmPassword: '' }))
    setIsSaving(false)
    router.refresh()
  }

  const handleClearDiscarded = async () => {
    toast.info('Clearing discarded items...')
    setIsClearing(true)
    try {
      const result = await clearDiscardedItems()
      toast.success(
        result.message || 'Discarded items cleared. Your feeds will be refreshed.'
      )
      router.refresh()
    } catch (error) {
      toast.error('Failed to clear items', { description: error.message })
    }
    setIsClearing(false)
  }

  if (!user) return null

  return (
    <div className="flex flex-col items-center">
      <Tabs
        defaultValue="profile"
        className="w-full"
        style={{ maxWidth: contentWidth > 0 ? `${contentWidth}px` : '100%' }}
      >
        <TabsList ref={tabsListRef} className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">
            <User className="w-4 h-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="preferences">
            <Filter className="w-4 h-4 mr-2" />
            Feed Preferences
          </TabsTrigger>
          <TabsTrigger value="advanced">
            <SettingsIcon className="w-4 h-4 mr-2" />
            Advanced
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <form onSubmit={handleSaveChanges}>
            <Card className="bg-slate-900/50 border-slate-700/80">
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your personal details and password.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={formData.email} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Leave blank to keep current"
                    value={formData.password}
                    onChange={handleChange}
                  />
                </div>
                {formData.password && (
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm new password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                    />
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Changes
                </Button>
              </CardFooter>
            </Card>
          </form>
        </TabsContent>

        <TabsContent value="preferences">
          <form onSubmit={handleSaveChanges}>
            <Card className="bg-slate-900/50 border-slate-700/80">
              <CardHeader>
                <CardTitle>Feed Preferences</CardTitle>
                <CardDescription>
                  Curate your intelligence feed by selecting countries and sectors of
                  interest.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Country Subscriptions</Label>
                  <CountrySubscriptionEditor
                    allCountries={allCountries}
                    selectedCountries={formData.countries}
                    onSelectionChange={(newCountries) =>
                      setFormData((prev) => ({ ...prev, countries: newCountries }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sector Subscriptions</Label>
                  <SectorSubscriptionEditor
                    allSectors={allSectors}
                    selectedSectors={formData.sectors}
                    onSelectionChange={(newSectors) =>
                      setFormData((prev) => ({ ...prev, sectors: newSectors }))
                    }
                  />
                </div>
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
        </TabsContent>

        <TabsContent value="advanced">
          <Card className="bg-slate-900/50 border-slate-700/80">
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
              <CardDescription>
                Manage application data and other settings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-yellow-200">Reset Discarded Items</p>
                  <p className="text-sm text-yellow-300/80">
                    If you've dismissed items by swiping, this will make them visible
                    again in your feeds.
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <Button
                    variant="outline"
                    onClick={handleClearDiscarded}
                    disabled={isClearing}
                    className="border-yellow-500/50 text-yellow-200 hover:bg-yellow-500/20 hover:text-yellow-100"
                  >
                    {isClearing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Clear Discarded
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
