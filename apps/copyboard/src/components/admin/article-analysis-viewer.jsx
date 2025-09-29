// src/app/_components/article-analysis-viewer.jsx (version 1.1)
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@components/shared'
import { Button } from '@components/shared'
import { Loader2 } from 'lucide-react'

export default function ArticleAnalysisViewer({ article, open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Analyze Article Content</DialogTitle>
          <DialogDescription className="truncate">
            Target URL:{' '}
            <a href={article?.link} target="_blank" className="underline">
              {article?.link}
            </a>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow flex flex-col items-center justify-center text-muted-foreground space-y-4">
          <Loader2 className="w-12 h-12 animate-spin gemini-text" />
          <p className="font-semibold">Feature Coming Soon</p>
          <p className="text-sm text-center">
            This module will allow you to test and find the perfect selector for
            extracting article content.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
