// File: apps/copyboard/src/app/admin/users/user-editor.jsx (version 2.0 - Server Actions)
'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Button,
  CardFooter,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
} from '@/components/shared'
import { toast } from 'sonner'
import { Save, Loader2, UserPlus, X } from 'lucide-react'
import CountrySubscriptionManager from './country-subscription-manager'
// The editor now uses the Server Actions directly.
import { createUserAction, updateUserAction } from './actions'
import { SUBSCRIPTION_TIERS } from '@headlines/models/client'

const FormField = ({ id, label, children, description }) => (
  <div className="space-y-2">
    <Label htmlFor={id} className="text-sm font-medium text-muted-foreground pl-1">
      {label}
    </Label>
    {children}
    {description && <p className="text-xs text-muted-foreground pl-1">{description}</p>}
  </div>
)

export default function UserEditor({
  user,
  onSave, // The onSave prop now comes from UsersClientPage
  onCancel,
  availableCountries,
  availableLanguages,
}) {
  const [formData, setFormData] = useState(user)
  const [isSaving, setIsSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  useEffect(() => {
    setFormData(user)
    setIsDirty(false)
  }, [user])

  if (!user) return null

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
    setIsDirty(true)
  }

  const handleSave = async () => {
    setIsSaving(true)
    // The onSave prop is now the `handleSaveEditor` function from the client page.
    await onSave(formData)
    setIsSaving(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col"
    >
      <div className="flex justify-between items-center flex-shrink-0 p-6 border-b border-white/10">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            {!user._id && <UserPlus />}
            {!user._id ? 'Create New User' : 'Edit User'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {!user._id ? 'Provide details for the new user.' : formData.email}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-grow overflow-y-auto p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField id="firstName" label="First Name">
            <Input
              value={formData.firstName || ''}
              onChange={(e) => handleChange('firstName', e.target.value)}
            />
          </FormField>
          <FormField id="lastName" label="Last Name">
            <Input
              value={formData.lastName || ''}
              onChange={(e) => handleChange('lastName', e.target.value)}
            />
          </FormField>
        </div>
        <FormField id="email" label="Email Address">
          <Input
            type="email"
            value={formData.email || ''}
            onChange={(e) => handleChange('email', e.target.value)}
            disabled={!!user._id}
          />
        </FormField>
        <FormField
          id="password"
          label="Password"
          description={
            !user._id
              ? 'Required for new users.'
              : 'Leave blank to keep current password.'
          }
        >
          <Input
            type="password"
            autoComplete="new-password"
            value={formData.password || ''}
            onChange={(e) => handleChange('password', e.target.value)}
          />
        </FormField>
        <Separator />
        <h3 className="text-lg font-semibold leading-none tracking-tight">
          Subscription Details
        </h3>
        <FormField label="Subscription Tier">
          <Select
            value={formData.subscriptionTier}
            onValueChange={(v) => handleChange('subscriptionTier', v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUBSCRIPTION_TIERS.map((tier) => (
                <SelectItem key={tier} value={tier}>
                  {tier}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Country Subscriptions">
          <CountrySubscriptionManager
            availableCountries={availableCountries}
            subscriptions={formData.countries || []}
            onChange={(newSubs) => handleChange('countries', newSubs)}
          />
        </FormField>
      </div>
      <CardFooter className="mt-auto border-t border-white/10 p-6 flex justify-end">
        <Button onClick={handleSave} disabled={!isDirty || isSaving}>
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </CardFooter>
    </motion.div>
  )
}
