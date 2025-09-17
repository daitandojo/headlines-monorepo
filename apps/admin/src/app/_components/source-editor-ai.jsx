// src/app/_components/source-editor-ai.jsx (version 1.1)
'use client'

import { useState } from 'react'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Textarea, Label, Separator } from '@headlines/ui/src/index.js'
import { toast } from 'sonner'
import { Loader2, Wand2 } from 'lucide-react'
import SuggestionAccordion from './suggestion-accordion'

const FormField = ({ id, label, children }) => (
  <div className="space-y-2">
    <Label htmlFor={id} className="text-sm font-medium text-muted-foreground pl-1">
      {label}
    </Label>
    {children}
  </div>
)

export default function SourceEditorAI({ sectionUrl, isBusy, onApplySuggestion }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState(null)
  const [example1, setExample1] = useState('')
  const [example2, setExample2] = useState('')
  const [outerHTML, setOuterHTML] = useState('')

  const canAnalyze =
    sectionUrl?.startsWith('http') &&
    example1.length > 5 &&
    example2.length > 5 &&
    outerHTML.length > 10

  const handleAITest = async () => {
    setIsAnalyzing(true)
    setAnalysis(null)
    toast.info('Analyzing source URL with AI...', {
      description: 'Using your examples to guide the search.',
    })
    try {
      const res = await fetch('/api/scrape/analyze-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: sectionUrl, example1, example2, outerHTML }),
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

  return (
    <Card className="bg-black/20 border-white/10 flex flex-col h-full">
      <CardHeader>
        <CardTitle>AI Guided Analysis</CardTitle>
        <CardDescription>
          Provide examples to help the AI find the best selectors.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col min-h-0">
        <div className="space-y-4">
          <FormField id="example1" label="Example Headline 1">
            <Input
              id="example1"
              value={example1}
              onChange={(e) => setExample1(e.target.value)}
              placeholder="Copy a full headline from the site"
            />
          </FormField>
          <FormField id="example2" label="Example Headline 2">
            <Input
              id="example2"
              value={example2}
              onChange={(e) => setExample2(e.target.value)}
              placeholder="Copy another full headline"
            />
          </FormField>
          <FormField id="outerHTML" label="Example Element outerHTML">
            <Textarea
              id="outerHTML"
              value={outerHTML}
              onChange={(e) => setOuterHTML(e.target.value)}
              placeholder="Right-click a headline > Inspect > Copy > Copy outerHTML"
              className="font-mono text-xs"
              rows={3}
            />
          </FormField>
        </div>
        <Button
          variant="outline"
          className="w-full mt-4"
          onClick={handleAITest}
          disabled={isAnalyzing || isBusy || !canAnalyze}
        >
          {isAnalyzing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Wand2 className="mr-2 h-4 w-4" />
          )}
          Analyze with AI
        </Button>
        <Separator className="my-4 bg-white/10" />
        <div className="flex-grow overflow-y-auto pr-2">
          {analysis ? (
            <SuggestionAccordion
              suggestions={analysis.suggestions}
              onApply={onApplySuggestion}
            />
          ) : (
            <div className="text-center text-muted-foreground pt-10">
              <p>Provide examples above and click "Analyze" to get suggestions.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
