// apps/client/src/components/admin/sources/steps/Step3_ConfigureSelectors.jsx (Restored & Pathed)
'use client'

import { useState } from 'react'
import { Button, Input, Label } from '@headlines/ui'
import { ArrowLeft, Save, Loader2, Wand2 } from 'lucide-react'
import { suggestSelector } from '@headlines/data-access'
import { toast } from 'sonner'

const SelectorInput = ({
  id,
  label,
  description,
  value,
  onChange,
  onSuggest,
  isLoading,
  sample,
}) => (
  <div className="space-y-2">
    <Label htmlFor={id} className="text-lg font-semibold">
      {label}
    </Label>
    <p className="text-sm text-slate-400">{description}</p>
    <div className="flex gap-2">
      <Input id={id} value={value} onChange={onChange} placeholder="e.g., h2.article-title a" />
      <Button variant="outline" onClick={onSuggest} disabled={isLoading} className="flex-shrink-0">
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Wand2 className="mr-2 h-4 w-4" />
        )}
        Suggest
      </Button>
    </div>
    {sample && (
      <div className="p-2 text-xs bg-slate-800/50 rounded-md border border-slate-700">
        <p className="text-slate-400">AI Sample Text:</p>
        <p className="italic text-slate-300 truncate">"{sample}"</p>
      </div>
    )}
  </div>
)

export function Step3_ConfigureSelectors({
  onSave,
  onBack,
  sourceConfig,
  updateConfig,
  isSaving,
}) {
  const [loadingStates, setLoadingStates] = useState({
    headline: false,
    article: false,
    image: false,
  })
  const [samples, setSamples] = useState({
    headline: '',
    article: '',
    image: '',
  })

  const handleSuggest = async (targetType, url) => {
    setLoadingStates((prev) => ({ ...prev, [targetType]: true }))
    const result = await suggestSelector(url, `the main ${targetType}`)
    setLoadingStates((prev) => ({ ...prev, [targetType]: false }))

    if (result.success) {
      const { selector, sample, confidence } = result.data
      const key = `${targetType}Selector`
      updateConfig({ [key]: selector })
      setSamples((prev) => ({ ...prev, [targetType]: sample }))
      toast.success(`AI suggested a ${targetType} selector with ${Math.round(confidence * 100)}% confidence.`)
    } else {
      toast.error(`AI failed to suggest a selector: ${result.error}`)
    }
  }
  
  const articleSampleUrl = sourceConfig.sectionUrl;

  return (
    <div className="space-y-6">
      <SelectorInput
        id="headlineSelector"
        label="Headline Selector"
        description="CSS selector to grab all headline links from the section page."
        value={sourceConfig.headlineSelector}
        onChange={(e) => updateConfig({ headlineSelector: e.target.value })}
        onSuggest={() => handleSuggest('headline', sourceConfig.sectionUrl)}
        isLoading={loadingStates.headline}
        sample={samples.headline}
      />
      <SelectorInput
        id="articleSelector"
        label="Article Body Selector"
        description="CSS selector for the main content/text of a single article page."
        value={sourceConfig.articleSelector}
        onChange={(e) => updateConfig({ articleSelector: e.target.value })}
        onSuggest={() => handleSuggest('article', articleSampleUrl)}
        isLoading={loadingStates.article}
        sample={samples.article}
      />
      <SelectorInput
        id="imageUrlSelector"
        label="Feature Image Selector"
        description="CSS selector for the main feature image on an article page (optional)."
        value={sourceConfig.imageUrlSelector}
        onChange={(e) => updateConfig({ imageUrlSelector: e.target.value })}
        onSuggest={() => handleSuggest('image', articleSampleUrl)}
        isLoading={loadingStates.image}
        sample={samples.image}
      />

      <div className="flex justify-between pt-4 border-t border-slate-700/50 mt-8">
        <Button variant="outline" onClick={onBack} disabled={isSaving}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={onSave}
          disabled={!sourceConfig.headlineSelector || !sourceConfig.articleSelector || isSaving}
        >
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save New Source
        </Button>
      </div>
    </div>
  )
}