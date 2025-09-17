// src/components/SettingsForm.jsx (version 1.0)
'use client';

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CountrySubscriptionEditor } from './CountrySubscriptionEditor'
import { Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export function SettingsForm({ allCountries }) {
  const { user, updateUserPreferences } = useAuth()
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    countries: [],
  })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        countries: user.countries || [],
      })
    }
  }, [user])

  const handleInputChange = (e) => {
    const { id, value } = e.target
    setFormData((prev) => ({ ...prev, [id]: value }))
  }

  const handleCountryChange = (newCountries) => {
    setFormData((prev) => ({ ...prev, countries: newCountries }))
  }

  const handleSaveChanges = async (e) => {
    e.preventDefault()
    setIsSaving(true)

    if (formData.email !== user.email) {
      if (!confirm('Are you sure you want to change your login email address?')) {
        setIsSaving(false)
        return
      }
    }

    try {
      await updateUserPreferences(formData)
    } catch (error) {
      toast.error('An unexpected error occurred.')
    } finally {
      setIsSaving(false)
    }
  }

  if (!user) {
    return null // or a loading skeleton
  }

  return (
    <form onSubmit={handleSaveChanges}>
      <Card className="bg-slate-900/50 border-slate-700/80">
        <CardHeader>
          <CardTitle>User Profile</CardTitle>
          <CardDescription>
            Update your personal details and country subscriptions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className="bg-slate-900/80"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className="bg-slate-900/80"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              className="bg-slate-900/80"
            />
          </div>
          <div className="space-y-2">
            <Label>Country Subscriptions</Label>
            <CountrySubscriptionEditor
              allCountries={allCountries}
              selectedCountries={formData.countries}
              onSelectionChange={handleCountryChange}
            />
          </div>
          <div className="flex justify-end pt-4 border-t border-slate-700/50">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
