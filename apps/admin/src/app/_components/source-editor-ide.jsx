// src/app/_components/source-editor-ide.jsx (version 1.4)
'use client'

import { useState } from 'react'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Separator } from '@headlines/ui'
import { toast } from 'sonner'
import { Wand2, Loader2, ExternalLink, ShieldAlert } from 'lucide-react'
import SuggestionAccordion from './suggestion-accordion'
import TestResultsModal from '../sources/test-results-modal'

export default function SourceEditorIDE({ source, onApplySuggestion, onSave }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isDebugging, setIsDebugging] = useState(false)
  const [analysis, setAnalysis] = useState(null)
  const [debugResults, setDebugResults] = useState(null)

  const isUrlValid = source.sectionUrl?.startsWith('http')
  const isFailing =
    source.analytics?.lastRunHeadlineCount === 0 && source.analytics?.totalRuns > 0

  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    setAnalysis(null)
    toast.info('Analyzing source URL with AI...', {
      description: 'This may take up to 45 seconds.',
    })
    try {
      const res = await fetch('/api/scrape/analyze-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: source.sectionUrl }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.details || 'Analysis failed.')
      setAnalysis(data.analysis)
      toast.success('AI Analysis complete!')
    } catch (err) {
      toast.error('AI Analysis Failed', { description: err.message })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleDebug = async () => {
    setIsDebugging(true)
    setDebugResults(null)
    toast.info('AI is attempting to auto-heal this source...', {
      description: 'This may take up to 60 seconds.',
    })
    try {
      const res = await fetch('/api/ai/debug-source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(source),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.details || 'AI debug failed.')

      setDebugResults({
        source,
        ...data.testResults,
        proposedConfig: data.proposedConfig,
      })
      toast.success('AI has proposed a fix. Please review the test results.')
    } catch (err) {
      toast.error('AI Debug Failed', { description: err.message })
    } finally {
      setIsDebugging(false)
    }
  }

  return (
    <>
      {debugResults && (
        <TestResultsModal
          results={debugResults}
          open={!!debugResults}
          onOpenChange={() => setDebugResults(null)}
          onFixApplied={(updatedSource) => {
            onSave(updatedSource) // Pass the saved source up to the main page
            setDebugResults(null)
          }}
        />
      )}
      <Card className="bg-transparent border-none shadow-none flex flex-col h-full">
        <CardHeader className="p-0">
          <CardTitle>Scraper IDE</CardTitle>
          <CardDescription>
            Use AI to find or fix selectors for this source.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col min-h-0 p-0 mt-6">
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleAnalyze}
              disabled={isAnalyzing || isDebugging || !isUrlValid}
            >
              {isAnalyzing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="mr-2 h-4 w-4" />
              )}
              AI Suggest Selectors
            </Button>
            {isFailing && (
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleDebug}
                disabled={isAnalyzing || isDebugging || !isUrlValid}
              >
                {isDebugging ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ShieldAlert className="mr-2 h-4 w-4" />
                )}
                AI Auto-Heal Headlines
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.open(source.sectionUrl, '_blank')}
              disabled={!isUrlValid}
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
          <Separator className="my-4 bg-white/10" />
          <div className="flex-grow overflow-y-auto pr-2">
            {analysis ? (
              <SuggestionAccordion
                suggestions={analysis.suggestions}
                onApply={(selector) =>
                  onApplySuggestion(selector, analysis.extractionMethod)
                }
              />
            ) : (
              <div className="text-center text-muted-foreground pt-10">
                <p>
                  Click "AI Suggest" to find selectors for this source, or "AI Auto-Heal"
                  if it's failing.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  )
}
