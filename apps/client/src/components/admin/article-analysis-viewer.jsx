// apps/client/src/components/admin/article-analysis-viewer.jsx
'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  ScrollArea,
  Textarea,
} from '@/components/shared'
import { Loader2, ServerCrash } from 'lucide-react'
import { toast } from 'sonner'

async function scrapeContent(sourceId, articleLink) {
  const res = await fetch('/api-admin/scrape', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceId, articleLink }),
  })
  if (!res.ok) {
    const errorData = await res.json()
    throw new Error(errorData.error || 'Scraping failed on the server.')
  }
  return res.json()
}

export default function ArticleAnalysisViewer({ article, sourceId, open, onOpenChange }) {
  const [content, setContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (open && article && sourceId) {
      setIsLoading(true)
      setError(null)
      scrapeContent(sourceId, article.link)
        .then((result) => {
          if (result.success && result.content) {
            setContent(result.content.preview)
          } else {
            throw new Error(result.error || 'No content returned.')
          }
        })
        .catch((err) => {
          setError(err.message)
          toast.error('Content scrape failed', { description: err.message })
        })
        .finally(() => {
          setIsLoading(false)
        })
    }
  }, [open, article, sourceId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Analyze Article Content</DialogTitle>
          <DialogDescription className="truncate">
            Target URL:{' '}
            <a
              href={article?.link}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              {article?.link}
            </a>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow my-4 min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-destructive">
              <ServerCrash className="w-12 h-12 mb-4" />
              <p className="font-semibold">Failed to load content</p>
              <p className="text-sm text-center max-w-md">{error}</p>
            </div>
          ) : (
            <Textarea
              readOnly
              value={content}
              placeholder="No content was extracted."
              className="h-full w-full resize-none bg-muted/50"
            />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
