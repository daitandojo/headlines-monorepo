// apps/client/src/components/admin/sources/steps/Step2_SelectSection.jsx (Restored & Pathed)
'use client'

import { useState } from 'react'
import { Button, Card, CardContent, Input } from '@headlines/ui'
import { ArrowRight, ArrowLeft, Loader2, Wand2 } from 'lucide-react'
import { suggestSections } from '@headlines/data-access'
import { toast } from 'sonner'

export function Step2_SelectSection({ onNext, onBack, sourceConfig, updateConfig }) {
  const [suggestions, setSuggestions] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedUrl, setSelectedUrl] = useState(sourceConfig.sectionUrl || '')
  
  const handleSuggestSections = async () => {
    setIsLoading(true)
    const result = await suggestSections(sourceConfig.baseUrl)
    setIsLoading(false)
    if (result.success) {
      setSuggestions(result.data)
      toast.success('AI analysis complete. Please review the suggestions.')
    } else {
      toast.error(`Failed to get suggestions: ${result.error}`)
    }
  }

  const handleSelectSuggestion = (url) => {
    const absoluteUrl = new URL(url, sourceConfig.baseUrl).href
    setSelectedUrl(absoluteUrl)
    updateConfig({ sectionUrl: absoluteUrl })
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Button onClick={handleSuggestSections} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Wand2 className="mr-2 h-4 w-4" />
          )}
          {isLoading ? 'Analyzing URL...' : 'Use AI to Suggest News Sections'}
        </Button>
      </div>

      {suggestions.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-slate-200">AI Suggestions:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suggestions.map((item, index) => (
              <Card
                key={index}
                className={`cursor-pointer transition-all ${
                  selectedUrl === new URL(item.url, sourceConfig.baseUrl).href
                    ? 'ring-2 ring-blue-500 bg-blue-900/20'
                    : 'bg-slate-800/50 hover:bg-slate-800'
                }`}
                onClick={() => handleSelectSuggestion(item.url)}
              >
                <CardContent className="p-4">
                  <p className="font-bold text-slate-100">{item.text}</p>
                  <p className="text-xs text-blue-400 truncate">
                    {new URL(item.url, sourceConfig.baseUrl).href}
                  </p>
                  <p className="text-xs text-slate-400 mt-2 italic">"{item.reasoning}"</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="pt-4 border-t border-slate-700/50">
        <p className="text-sm text-slate-400 mb-2">
          If none of the suggestions are correct, you can manually enter the URL.
        </p>
        <Input
          value={selectedUrl}
          onChange={(e) => handleSelectSuggestion(e.target.value)}
          placeholder="Enter section URL manually..."
        />
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={onNext} disabled={!selectedUrl.startsWith('http')}>
          Next: Configure Selectors
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}