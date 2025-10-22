// apps/client/src/components/client/opportunities/OutreachDraftModal.jsx
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
  Label,
  Input,
  Textarea,
  Skeleton,
} from '@/components/shared'
import { Mail, Copy, Send, Wand2 } from 'lucide-react'
import { toast } from 'sonner'

async function fetchDraft(opportunityId) {
  const res = await fetch(`/api/opportunities/${opportunityId}/draft-outreach`, {
    method: 'POST',
  })
  if (!res.ok) {
    const errorData = await res.json()
    throw new Error(errorData.error || 'Failed to generate draft')
  }
  return res.json()
}

export function OutreachDraftModal({ opportunity, open, onOpenChange }) {
  const [draft, setDraft] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (open && opportunity?._id) {
      setIsLoading(true)
      setError(null)
      setDraft(null)
      fetchDraft(opportunity._id)
        .then(setDraft)
        .catch(setError)
        .finally(() => setIsLoading(false))
    }
  }, [open, opportunity])

  const handleCopyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard!')
  }

  const handleMailTo = () => {
    if (!draft) return
    const mailtoLink = `mailto:${opportunity.contactDetails?.email || ''}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`
    window.location.href = mailtoLink
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-purple-400" />
            AI Outreach Assistant
          </DialogTitle>
          <DialogDescription>
            A personalized draft for reaching out to {opportunity?.reachOutTo}. Review and
            edit before sending.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {isLoading && (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          )}
          {error && (
            <div className="text-red-500 p-4 bg-red-500/10 rounded-md">
              Error: {error.message}
            </div>
          )}
          {draft && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="subject"
                    value={draft.subject}
                    onChange={(e) => setDraft((d) => ({ ...d, subject: e.target.value }))}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleCopyToClipboard(draft.subject)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="body">Body</Label>
                <Textarea
                  id="body"
                  value={draft.body}
                  onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
                  className="h-64 resize-none"
                />
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="secondary"
            onClick={() => handleCopyToClipboard(draft.body)}
            disabled={!draft}
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy Body
          </Button>
          <Button onClick={handleMailTo} disabled={!draft}>
            <Send className="mr-2 h-4 w-4" />
            Open in Email Client
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
