// src/app/_components/test-results-viewer.jsx (version 1.2)
import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  ScrollArea,
  Button,
} from '@headlines/ui'
import { ExternalLink, FileText, XCircle } from 'lucide-react'
import ArticleAnalysisViewer from './article-analysis-viewer'

export default function TestResultsViewer({ results, open, onOpenChange }) {
  const [articleToAnalyze, setArticleToAnalyze] = useState(null)

  const hasResults = results && results.count > 0

  const handleAnalyzeClick = (article) => {
    setArticleToAnalyze(article)
  }

  return (
    <>
      <ArticleAnalysisViewer
        article={articleToAnalyze}
        open={!!articleToAnalyze}
        onOpenChange={(isOpen) => !isOpen && setArticleToAnalyze(null)}
      />
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Scrape Test Results</DialogTitle>
            <DialogDescription>
              Found {results?.count ?? 0} headlines using the provided configuration.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-grow overflow-hidden">
            <ScrollArea className="h-full pr-4">
              {hasResults ? (
                <ul className="space-y-3">
                  {results.headlines.map((item, index) => (
                    <li
                      key={index}
                      className="p-3 bg-secondary/50 rounded-md flex items-center justify-between gap-4"
                    >
                      <div className="flex-grow">
                        <p className="font-medium">{item.headline}</p>
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          {item.link}
                        </a>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAnalyzeClick(item)}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Analyze Article
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <XCircle className="w-12 h-12 mb-4 text-destructive" />
                  <p className="font-semibold">No Headlines Found</p>
                  <p className="text-sm">
                    Check your selectors or the source website's structure.
                  </p>
                  {results?.error && (
                    <p className="text-xs mt-4 max-w-md text-center">
                      Error: {results.details}
                    </p>
                  )}
                </div>
              )}
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
