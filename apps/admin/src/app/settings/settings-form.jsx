// apps/admin/src/app/settings/settings-form.jsx (version 1.3.0)
'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardFooter, Tabs, TabsContent, TabsList, TabsTrigger } from '@headlines/ui'
import { Label } from '@headlines/ui'
import { Input } from '@headlines/ui'
import { Switch } from '@headlines/ui'
import { Button } from '@headlines/ui'
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
          className="bg-black/20 border-white/10"
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
          className="bg-black/20 border-white/10"
        />
      )
  }
}

const SettingRow = ({ setting, onChange }) => (
    <div key={setting.key} className="grid grid-cols-3 items-center gap-4">
        <div className="col-span-2">
        <Label htmlFor={setting.key}>{setting.key.replace(/_/g, ' ')}</Label>
        <p className="text-sm text-muted-foreground">{setting.description}</p>
        </div>
        <SettingInput setting={setting} onChange={onChange} />
    </div>
);

export default function SettingsForm({ initialSettings = [], onSave }) {
  const [settings, setSettings] = useState(initialSettings)
  const [isSaving, setIsSaving] = useState(false)

  const { thresholdSettings, modelSettings, promptSettings } = useMemo(() => {
    const thresholds = [], models = [], prompts = [];
    (initialSettings || []).forEach(s => {
        if (s.key.includes('_THRESHOLD') || s.key.includes('MIN_')) {
            thresholds.push(s);
        } else if (s.key.includes('LLM_MODEL')) {
            models.push(s);
        } else {
            prompts.push(s);
        }
    });
    return { thresholdSettings: thresholds, modelSettings: models, promptSettings: prompts };
  }, [initialSettings]);


  const handleChange = (key, value) => {
    setSettings((prev) => prev.map((s) => (s.key === key ? { ...s, value } : s)))
  }

  const handleSaveClick = async () => {
    setIsSaving(true)
    await onSave(settings)
    setIsSaving(false)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="bg-black/20 border-white/10">
        <CardContent className="pt-6">
           <Tabs defaultValue="thresholds">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="thresholds">Thresholds</TabsTrigger>
                    <TabsTrigger value="ai_models">AI Models</TabsTrigger>
                    <TabsTrigger value="prompt_params">Prompt Parameters</TabsTrigger>
                </TabsList>
                <TabsContent value="thresholds" className="mt-6 space-y-6">
                    {thresholdSettings.map(setting => <SettingRow key={setting.key} setting={setting} onChange={handleChange} />)}
                </TabsContent>
                <TabsContent value="ai_models" className="mt-6 space-y-6">
                    {modelSettings.map(setting => <SettingRow key={setting.key} setting={setting} onChange={handleChange} />)}
                </TabsContent>
                <TabsContent value="prompt_params" className="mt-6 space-y-6">
                    {promptSettings.map(setting => <SettingRow key={setting.key} setting={setting} onChange={handleChange} />)}
                </TabsContent>
           </Tabs>
        </CardContent>
        <CardFooter className="border-t border-white/10 px-6 py-4">
          <Button onClick={handleSaveClick} disabled={isSaving}>
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
