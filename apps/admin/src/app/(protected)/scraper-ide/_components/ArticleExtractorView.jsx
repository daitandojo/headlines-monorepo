// apps/admin/src/app/(protected)/scraper-ide/_components/ArticleExtractorView.jsx (version 4.0.0)
'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Button,
  Textarea,
  Label,
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  Badge,
} from '@headlines/ui'
import { toast } from 'sonner'
import { heuristicallyFindSelectors } from '@headlines/scraper-logic/scraper/selectorOptimizer.js'
import * as cheerio from 'cheerio'
import { testRecipe } from '@/lib/api-client'

export default function ArticleExtractorView({
  articleHtml,
  onSetSelector,
  value,
  sourceConfig,
}) {
  const [extractedText, setExtractedText] = useState('')
  const [suggestions, setSuggestions] = useState([])

  const cleanBodyHtml = useMemo(() => {
    if (!articleHtml) return ''
    const $ = cheerio.load(articleHtml)
    $('script, style, link, noscript, svg, header, footer, nav, aside').remove()
    return $('body').html() || ''
  }, [articleHtml])

  useEffect(() => {
    if (cleanBodyHtml) {
      const heuristicSuggestions = heuristicallyFindSelectors(cleanBodyHtml)
      setSuggestions(heuristicSuggestions)

      if ((!value || value.length === 0) && heuristicSuggestions.length > 0) {
        onSetSelector([heuristicSuggestions[0].selector])
        toast.info('Heuristics suggested an article selector.')
      }
    }
  }, [cleanBodyHtml, onSetSelector, value])

  const handleManualExtract = async () => {
    if (!value || value.length === 0) return toast.error('No selector provided to test.')
    const testConfig = { ...sourceConfig, articleSelector: value }
    const result = await testRecipe(testConfig, sourceConfig.sectionUrl) // A bit of a hack to reuse testRecipe
    if (result.success && result.content.preview) {
      setExtractedText(result.content.preview)
      toast.success(`Extracted ${result.content.preview.length} characters.`)
    } else {
      setExtractedText('')
      toast.warn('Selector seems valid, but no text was found.')
    }
  }

  return (
    <div className="p-4 h-full grid grid-rows-[auto_1fr] gap-4">
      <div>
        <Label htmlFor="article-selector">Article Body Selectors</Label>
        <div className="flex gap-2 mt-1">
          <Textarea
            id="article-selector"
            value={(value || []).join(', ')}
            onChange={(e) =>
              onSetSelector(
                e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
              )
            }
            placeholder="e.g., div.prose, main > article"
            rows={2}
            className="font-mono text-sm"
          />
          <Button
            onClick={handleManualExtract}
            variant="outline"
            className="h-auto"
            disabled={!value || value.length === 0}
          >
            Test Selector
          </Button>
        </div>
      </div>
      <div className="min-h-0 grid grid-cols-2 gap-4">
        <div className="border rounded-md overflow-y-auto p-2">
          <h4 className="text-sm font-semibold mb-2 px-2">Selector Suggestions</h4>
          <Accordion type="single" collapsible className="w-full">
            {suggestions.map((item, index) => (
              <AccordionItem value={`item-${index}`} key={index}>
                <AccordionTrigger className="font-mono text-xs px-2 hover:bg-white/5 rounded">
                  <div className="flex justify-between w-full items-center pr-2">
                    <span className="truncate">{item.selector}</span>
                    <Badge variant="secondary">{item.score.toFixed(0)} score</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-2">
                  <div className="bg-background/50 p-2 rounded-md border">
                    <Button
                      size="sm"
                      className="w-full mb-2"
                      onClick={() => onSetSelector([item.selector])}
                    >
                      Apply this Selector
                    </Button>
                    <p className="text-xs text-muted-foreground p-2 bg-background rounded max-h-24 overflow-y-auto">
                      {(item.samples || []).join(' ').substring(0, 300)}...
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
        <Textarea
          readOnly
          value={extractedText}
          className="h-full w-full resize-none bg-secondary/50"
          placeholder="Test a selector to see the extracted text here..."
        />
      </div>
    </div>
  )
}
