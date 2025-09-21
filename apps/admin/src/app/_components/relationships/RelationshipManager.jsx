// apps/admin/src/app/_components/relationships/RelationshipManager.jsx (version 2.0.0)
'use client'

import { useState } from 'react'
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@headlines/ui'
import { toast } from 'sonner'
import { Link, Unlink, Plus, Loader2 } from 'lucide-react'
import {
  linkOpportunityToEventClient,
  unlinkOpportunityFromEventClient,
} from '@/lib/api-client'

export function RelationshipManager({ item, itemType, refetch }) {
  const [newItemId, setNewItemId] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleAdd = async () => {
    setIsLoading(true)
    let result
    if (itemType === 'event') {
      result = await linkOpportunityToEventClient(item._id, newItemId)
    } // Add else if for 'opportunity' here for bidirectional linking

    if (result.success) {
      toast.success('Relationship added.')
      setNewItemId('')
      refetch()
    } else {
      toast.error('Failed to add relationship', { description: result.error })
    }
    setIsLoading(false)
  }

  const handleRemove = async (relatedItemId) => {
    setIsLoading(true)
    let result
    if (itemType === 'event') {
      result = await unlinkOpportunityFromEventClient(item._id, relatedItemId)
    } // Add else if for 'opportunity' here

    if (result.success) {
      toast.success('Relationship removed.')
      refetch()
    } else {
      toast.error('Failed to remove relationship', { description: result.error })
    }
    setIsLoading(false)
  }

  const relatedItems = itemType === 'event' ? item.relatedOpportunities : item.events
  const relatedItemType = itemType === 'event' ? 'Opportunity' : 'Event'

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Relationships</CardTitle>
        <CardDescription>Link this {itemType} to related items.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Existing {relatedItemType} Links</Label>
          <div className="space-y-2 mt-2">
            {relatedItems && relatedItems.length > 0 ? (
              relatedItems.map((related) => (
                <div
                  key={related._id}
                  className="flex items-center justify-between p-2 bg-secondary rounded-md"
                >
                  <div className="font-mono text-xs">{related._id}</div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => handleRemove(related._id)}
                  >
                    <Unlink className="h-4 w-4" />
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground p-2">No relationships found.</p>
            )}
          </div>
        </div>
        <div>
          <Label htmlFor="new-item-id">Link New {relatedItemType} ID</Label>
          <div className="flex items-center gap-2 mt-2">
            <Input
              id="new-item-id"
              value={newItemId}
              onChange={(e) => setNewItemId(e.target.value)}
              placeholder={`Paste ${relatedItemType} ID here...`}
            />
            <Button onClick={handleAdd} disabled={isLoading || !newItemId}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
