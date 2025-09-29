'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  PageHeader,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ScrollArea,
  Textarea,
} from '@/components/shared'
import { Loader2, TestTube2, Newspaper, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { useSources } from './useSources'
// We need a hook to get the list of all countries for the first dropdown
import { useCountries } from './useCountries'

async function performScrape(payload) {
  const res = await fetch('/api-admin/scrape', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const errorData = await res.json()
    throw new Error(errorData.error || 'Scraping failed on the server.')
  }
  return res.json()
}

export default function ScraperIdePage() {
  const { countries, isLoading: isLoadingCountries } = useCountries()
  const [selectedCountry, setSelectedCountry] = useState('')
  const [selectedSourceId, setSelectedSourceId] = useState('')

  // The useSources hook is now dependent on the selected country
  const { sources, isLoading: isLoadingSources } = useSources(selectedCountry)

  const [isScraping, setIsScraping] = useState(false)
  const [scrapeResults, setScrapeResults] = useState({ headlines: [], content: '' })

  const selectedSource = useMemo(
    () => sources.find((s) => s._id === selectedSourceId),
    [sources, selectedSourceId]
  )

  const handleCountryChange = (country) => {
    setSelectedCountry(country)
    setSelectedSourceId('') // Reset source selection when country changes
    setScrapeResults({ headlines: [], content: '' }) // Clear results
  }

  const handleScrapeHeadlines = useCallback(async () => {
    if (!selectedSourceId || !selectedSource) return
    setIsScraping(true)
    setScrapeResults({ headlines: [], content: '' })
    const toastId = toast.loading(`Scraping headlines for ${selectedSource.name}...`)
    try {
      const result = await performScrape({ sourceId: selectedSourceId })
      if (result.success) {
        toast.success(`Found ${result.resultCount} headlines.`, { id: toastId })
        setScrapeResults({ headlines: result.articles, content: '' })
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      toast.error('Scrape failed', { id: toastId, description: error.message })
    } finally {
      setIsScraping(false)
    }
  }, [selectedSourceId, selectedSource])

  const handleScrapeContent = useCallback(
    async (articleLink) => {
      if (!selectedSourceId) return
      setIsScraping(true)
      setScrapeResults((prev) => ({ ...prev, content: 'Loading...' }))
      const toastId = toast.loading(`Scraping content for article...`)
      try {
        const result = await performScrape({ sourceId: selectedSourceId, articleLink })
        if (result.success) {
          toast.success(`Content scrape successful.`, { id: toastId })
          setScrapeResults((prev) => ({ ...prev, content: result.content }))
        } else {
          throw new Error(result.content)
        }
      } catch (error) {
        toast.error('Content scrape failed', { id: toastId, description: error.message })
        setScrapeResults((prev) => ({ ...prev, content: `Error: ${error.message}` }))
      } finally {
        setIsScraping(false)
      }
    },
    [selectedSourceId]
  )

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Scraper IDE"
        description="A live testing environment to scrape headlines and article content from any configured source."
      />

      <Card className="mt-8">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-4">
          <Select
            value={selectedCountry}
            onValueChange={handleCountryChange}
            disabled={isScraping}
          >
            <SelectTrigger className="w-full sm:w-[250px]">
              <SelectValue placeholder="Step 1: Select a Country..." />
            </SelectTrigger>
            <SelectContent>
              {isLoadingCountries ? (
                <SelectItem value="loading" disabled>
                  Loading countries...
                </SelectItem>
              ) : (
                countries.map((country) => (
                  <SelectItem key={country._id} value={country.name}>
                    {country.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>

          <Select
            value={selectedSourceId}
            onValueChange={setSelectedSourceId}
            disabled={isScraping || !selectedCountry}
          >
            <SelectTrigger className="w-full sm:w-[350px]">
              <SelectValue placeholder="Step 2: Select a Source..." />
            </SelectTrigger>
            <SelectContent>
              {isLoadingSources ? (
                <SelectItem value="loading" disabled>
                  Loading sources...
                </SelectItem>
              ) : (
                sources.map((source) => (
                  <SelectItem key={source._id} value={source._id}>
                    {source.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>

          <Button
            onClick={handleScrapeHeadlines}
            disabled={!selectedSourceId || isScraping}
          >
            {isScraping ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <TestTube2 className="mr-2 h-4 w-4" />
            )}
            Scrape Headlines
          </Button>
        </CardContent>
      </Card>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4 flex-grow min-h-0">
        {/* ... The rest of the component (Headlines and Content cards) remains the same ... */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Newspaper className="h-5 w-5" /> Scraped Headlines (
              {scrapeResults.headlines.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-grow overflow-hidden">
            <ScrollArea className="h-full">
              <ul className="space-y-2 pr-4">
                {scrapeResults.headlines.map((article, i) => (
                  <li key={article.link || i}>
                    <Button
                      variant="ghost"
                      className="w-full h-auto text-left justify-start p-2 hover:bg-accent"
                      onClick={() => handleScrapeContent(article.link)}
                    >
                      {article.headline}
                    </Button>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" /> Article Content
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-grow">
            <Textarea
              readOnly
              value={scrapeResults.content}
              placeholder="Click a headline on the left to scrape and display its content here."
              className="h-full resize-none bg-muted/50"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
