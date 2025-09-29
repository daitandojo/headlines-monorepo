// apps/admin/src/app/(protected)/settings/page.jsx (version 2.0.0)
'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { PageHeader } from '@components/shared'
import SettingsForm from './settings-form'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { getSettings, updateSettings } from '@/lib/api-client'

export default function SettingsPage() {
  const [settings, setSettings] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    getSettings().then((result) => {
      if (result.settings) {
        setSettings(result.settings)
      } else {
        toast.error('Failed to load settings: ' + result.error)
        setSettings([])
      }
      setIsLoading(false)
    })
  }, [])

  const handleSave = async (updatedSettings) => {
    toast.info('Saving settings...')
    const result = await updateSettings(updatedSettings)
    if (!result.error) {
      setSettings(updatedSettings)
      toast.success('Settings saved successfully.')
      return true
    } else {
      toast.error(`Error: ${result.error}`)
      return false
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-12 h-12 animate-spin gemini-text" />
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
