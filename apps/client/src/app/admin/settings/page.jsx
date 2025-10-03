'use client' // This page needs client-side state management for the form

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { PageHeader } from '@/components/shared'
import SettingsForm from './settings-form'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

// Client-side API functions
async function getSettingsClient() {
  const res = await fetch('/api-admin/settings')
  if (!res.ok) throw new Error('Failed to fetch settings')
  return res.json()
}

async function updateSettingsClient(updatedSettings) {
  const res = await fetch('/api-admin/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatedSettings),
  })
  if (!res.ok) {
    const errorData = await res.json()
    throw new Error(errorData.error || 'Failed to update settings')
  }
  return res.json()
}

export default function SettingsPage() {
  const [settings, setSettings] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    getSettingsClient()
      .then((result) => {
        if (result.success) {
          setSettings(result.data)
        } else {
          toast.error('Failed to load settings: ' + result.error)
          setSettings([])
        }
      })
      .catch((err) => toast.error('Failed to load settings: ' + err.message))
      .finally(() => setIsLoading(false))
  }, [])

  const handleSave = useCallback(async (updatedSettings) => {
    const toastId = toast.loading('Saving settings...')
    try {
      await updateSettingsClient(updatedSettings)
      setSettings(updatedSettings) // Update local state with the saved data
      toast.success('Settings saved successfully.', { id: toastId })
      return true
    } catch (error) {
      toast.error(`Error: ${error.message}`, { id: toastId })
      return false
    }
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <PageHeader
        title="Pipeline Settings"
        description="Dynamically adjust thresholds and parameters for the backend scraper pipeline."
      />
      <div className="mt-8">
        <SettingsForm initialSettings={settings} onSave={handleSave} />
      </div>
    </motion.div>
  )
}
