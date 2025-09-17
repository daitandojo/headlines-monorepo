// apps/admin/src/app/users/user-editor.jsx (version 3.0.0 - API Route Refactor)
'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button, CardFooter, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Switch, Separator, Textarea } from '@headlines/ui'
import { toast } from 'sonner'
import { Save, Loader2, UserPlus, X } from 'lucide-react'
import CountrySubscriptionManager from './country-subscription-manager'

// Removed direct imports of createSubscriber, updateSubscriber from @headlines/data-access

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
  onSave,
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

  const isNewUser = !formData._id

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
    setIsDirty(true)
  }

  const handleDateChange = (e) => {
    const value = e.target.value
    const dateValue = value ? new Date(value) : null
    handleChange('subscriptionExpiresAt', dateValue)
  }

  const handleSave = async () => {
    setIsSaving(true);
    const url = isNewUser ? '/api/subscribers' : `/api/subscribers/${user._id}`;
    const method = isNewUser ? 'POST' : 'PATCH';
    
    try {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const result = await res.json();
        
        if (!res.ok) {
            throw new Error(result.error || 'Failed to save user.');
        }

        onSave(result.subscriber); // The API route returns the saved user object
        toast.success(`User "${result.subscriber.email}" ${isNewUser ? 'created' : 'updated'}.`);

    } catch (error) {
        toast.error(`Error saving user: ${error.message}`);
    } finally {
        setIsSaving(false);
    }
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
            {isNewUser && <UserPlus />}
            {isNewUser ? 'Create New User' : 'Edit User'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isNewUser ? 'Provide details for the new user.' : formData.email}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-grow overflow-y-auto p-6 space-y-6">
        <h3 className="text-lg font-semibold leading-none tracking-tight">
          Account Details
        </h3>
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
            disabled={!isNewUser}
          />
        </FormField>
        <FormField
          id="password"
          label="Password"
          description={
            isNewUser
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField label="Role">
            <Select value={formData.role} onValueChange={(v) => handleChange('role', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Account Status">
            <Select
              value={String(formData.isActive)}
              onValueChange={(v) => handleChange('isActive', v === 'true')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </div>
        <Separator />
        <h3 className="text-lg font-semibold leading-none tracking-tight">Preferences</h3>
        <FormField label="Preferred Language">
          <Select
            value={formData.language}
            onValueChange={(v) => handleChange('language', v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableLanguages.map((lang) => (
                <SelectItem key={lang} value={lang}>
                  {lang}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center space-x-2">
            <Switch
              id="email-notifications"
              checked={formData.emailNotificationsEnabled}
              onCheckedChange={(v) => handleChange('emailNotificationsEnabled', v)}
            />
            <Label htmlFor="email-notifications">Email Notifications</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="push-notifications"
              checked={formData.pushNotificationsEnabled}
              onCheckedChange={(v) => handleChange('pushNotificationsEnabled', v)}
            />
            <Label htmlFor="push-notifications">Push Notifications</Label>
          </div>
        </div>
        <Separator />
        <h3 className="text-lg font-semibold leading-none tracking-tight">
          Subscription Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField label="Subscription Tier">
            <Select
              value={formData.subscriptionTier || 'free'}
              onValueChange={(v) => handleChange('subscriptionTier', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField id="expiresAt" label="Subscription Expires At">
            <Input
              type="date"
              value={
                formData.subscriptionExpiresAt
                  ? new Date(formData.subscriptionExpiresAt).toISOString().split('T')[0]
                  : ''
              }
              onChange={handleDateChange}
            />
          </FormField>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="lifetime"
            checked={formData.isLifetimeFree || false}
            onCheckedChange={(v) => handleChange('isLifetimeFree', v)}
          />
          <Label htmlFor="lifetime">Lifetime Access</Label>
        </div>
        <Separator />
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
