'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Card,
  CardContent,
  CardFooter,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Label,
  Input,
  Switch,
  Button,
} from '@/components/shared'
import { Save, Loader2 } from 'lucide-react'

const SettingInput = ({ setting, onChange }) => {
  const { type, key, value } = setting
  switch (type) {
    case 'number':
      return (
        <Input
          type="number"
          id={key}
          value={value}
          onChange={(e) => onChange(key, parseFloat(e.target.value))}
          className="bg-secondary"
        />
      )
    case 'boolean':
      return (
        <Switch
          id={key}
          checked={value}
          onCheckedChange={(checked) => onChange(key, checked)}
        />
      )
    default:
      return (
        <Input
          type="text"
          id={key}
          value={value}
          onChange={(e) => onChange(key, e.target.value)}
          className="bg-secondary"
        />
      )
  }
}

const SettingRow = ({ setting, onChange }) => (
  <div key={setting.key} className="grid grid-cols-3 items-center gap-4 py-2">
    <div className="col-span-2">
      <Label htmlFor={setting.key} className="font-mono text-sm">
        {setting.key.replace(/_/g, ' ')}
      </Label>
      <p className="text-sm text-muted-foreground">{setting.description}</p>
    </div>
    <SettingInput setting={setting} onChange={onChange} />
  </div>
)

export default function SettingsForm({ initialSettings = [], onSave }) {
  const [settings, setSettings] = useState(initialSettings)
  const [isSaving, setIsSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  const { thresholdSettings, modelSettings, promptSettings } = useMemo(() => {
    const thresholds = [],
      models = [],
      prompts = []
    ;(settings || []).forEach((s) => {
      if (s.key.includes('_THRESHOLD') || s.key.includes('MIN_')) {
        thresholds.push(s)
      } else if (s.key.includes('LLM_MODEL')) {
        models.push(s)
      } else {
        prompts.push(s)
      }
    })
    return {
      thresholdSettings: thresholds,
      modelSettings: models,
      promptSettings: prompts,
    }
  }, [settings])

  const handleChange = (key, value) => {
    setSettings((prev) => prev.map((s) => (s.key === key ? { ...s, value } : s)))
    setIsDirty(true)
  }

  const handleSaveClick = async () => {
    setIsSaving(true)
    const success = await onSave(settings)
    if (success) {
      setIsDirty(false)
    }
    setIsSaving(false)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="thresholds">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="thresholds">Thresholds</TabsTrigger>
              <TabsTrigger value="ai_models">AI Models</TabsTrigger>
              <TabsTrigger value="prompt_params">Prompt Parameters</TabsTrigger>
            </TabsList>
            <TabsContent
              value="thresholds"
              className="mt-6 space-y-2 divide-y divide-border"
            >
              {thresholdSettings.map((setting) => (
                <SettingRow key={setting.key} setting={setting} onChange={handleChange} />
              ))}
            </TabsContent>
            <TabsContent
              value="ai_models"
              className="mt-6 space-y-2 divide-y divide-border"
            >
              {modelSettings.map((setting) => (
                <SettingRow key={setting.key} setting={setting} onChange={handleChange} />
              ))}
            </TabsContent>
            <TabsContent
              value="prompt_params"
              className="mt-6 space-y-2 divide-y divide-border"
            >
              {promptSettings.map((setting) => (
                <SettingRow key={setting.key} setting={setting} onChange={handleChange} />
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSaveClick} disabled={isSaving || !isDirty}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Settings
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  )
}
