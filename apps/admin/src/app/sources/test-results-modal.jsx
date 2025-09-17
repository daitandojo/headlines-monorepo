// src/app/sources/test-results-modal.jsx (version 1.0)
'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@headlines/ui/src/index.js'
import { Button } from '@headlines/ui/src/index.js'
import { Alert, AlertDescription, AlertTitle } from '@headlines/ui/src/index.js'
import { Separator } from '@headlines/ui/src/index.js'
import {
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Loader2,
  FileText,
  ExternalLink,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

const ResultItem = ({ headline, link }) => (
  <div className="flex items-center justify-between p-2 rounded-md bg-secondary/50">
    <div>
      <p className="text-sm font-medium">{headline}</p>
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-muted-foreground hover:underline"
      >
        {link}
      </a>
    </div>
    <Button variant="ghost" size="icon" asChild className="h-8 w-8 text-muted-foreground">
      <a href={link} target="_blank" rel="noopener noreferrer">
        <ExternalLink className="w-4 h-4" />
      </a>
    </Button>
  </div>
)

export default function TestResultsModal({ results, open, onOpenChange, onFixApplied }) {
  const [isSaving, setIsSaving] = useState(false)

  const { success, count, headlines, firstArticleContent, proposedConfig, source } =
    results

  const handleApplyFix = async () => {
    setIsSaving(true)
    const toastId = toast.loading(`Applying fix for "${proposedConfig.name}"...`)
    try {
      const res = await fetch(`/api/sources/${proposedConfig._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proposedConfig),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`Fix applied successfully for "${data.source.name}"!`, {
        id: toastId,
      })
      onFixApplied(data.source)
    } catch (err) {
      toast.error(`Failed to apply fix: ${err.message}`, { id: toastId })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            AI Auto-Heal Results for "{source.name}"
          </DialogTitle>
          <DialogDescription>
            The AI analyzed the broken source and proposed the following changes and
            results.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <AlertTitle>Proposed Configuration</AlertTitle>
            <AlertDescription className="font-mono text-xs space-y-1">
              <p>
                <strong>Headline Sel:</strong> {proposedConfig.headlineSelector}
              </p>
              <p>
                <strong>Link Sel:</strong>{' '}
                {proposedConfig.linkSelector || '(not changed)'}
              </p>
              <p>
                <strong>Text Sel:</strong>{' '}
                {proposedConfig.headlineTextSelector || '(not changed)'}
              </p>
            </AlertDescription>
          </Alert>

          <Separator />

          <div>
            <h4 className="font-semibold mb-2">Live Test Results with New Config</h4>
            <div className="flex items-center gap-2 text-sm">
              {success ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              <p>
                Test {success ? 'succeeded' : 'failed'}, found{' '}
                <strong className={success ? 'text-green-400' : 'text-red-400'}>
                  {count}
                </strong>{' '}
                headlines.
              </p>
            </div>
          </div>

          {success && (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
              {headlines.map((item, i) => (
                <ResultItem key={i} {...item} />
              ))}
            </div>
          )}

          {firstArticleContent && (
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                First Article Content Preview
              </h4>
              <p className="text-xs p-3 bg-secondary/50 rounded-md font-mono text-muted-foreground max-h-24 overflow-y-auto">
                {firstArticleContent}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApplyFix} disabled={!success || isSaving}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="mr-2 h-4 w-4" />
            )}
            {isSaving ? 'Applying...' : 'Apply & Save Fix'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
