// apps/admin/src/app/sources/add-source-modal.jsx (version 2.0.0)
'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@headlines/ui'
import { Input } from '@headlines/ui'
import { Label } from '@headlines/ui'
import { Button } from '@headlines/ui'
import { Wand2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function AddSourceModal({ open, onOpenChange, onAnalysisComplete }) {
  const [url, setUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleAnalyze = async () => {
    if (!url.startsWith('http')) {
      toast.error('Please enter a valid URL.')
      return
    }
    setIsLoading(true)
    const toastId = toast.loading('Initiating AI Co-Pilot analysis...')
    try {
      const res = await fetch('/api/ai/full-source-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.details || 'Full analysis failed on the server.')
      }
      onAnalysisComplete(data.configuration, data.testResults)
      toast.success('AI Co-Pilot analysis complete! Review and save the new source.', {
        id: toastId,
      })
    } catch (err) {
      toast.error('AI Co-Pilot Failed', { id: toastId, description: err.message })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Source via AI Co-Pilot</DialogTitle>
          <DialogDescription>
            Enter the URL of a news section. The AI will analyze it, suggest a full
            configuration, and perform a live test.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="url">Section URL</Label>
          <Input
            id="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.example.com/news/business"
          />
        </div>
        <DialogFooter>
          <Button onClick={handleAnalyze} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" />
            )}
            AI Configure & Test
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
