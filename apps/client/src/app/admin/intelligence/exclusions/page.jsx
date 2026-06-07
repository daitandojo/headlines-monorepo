'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { PageHeader, Badge, Button } from '@/components/shared'
import { Loader2, Plus, X, ShieldBan } from 'lucide-react'
import { toast } from 'sonner'

export default function ExclusionsPage() {
  const [exclusions, setExclusions] = useState([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')

  const fetch = useCallback(async () => {
    try {
      const res = await fetch('/api-admin/intelligence/exclusions')
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setExclusions(data.exclusions || [])
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const addExclusion = async () => {
    const name = newName.trim()
    if (!name) return
    try {
      const res = await fetch('/api-admin/intelligence/exclusions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, action: 'add' }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to add')
        return
      }
      setExclusions(data.exclusions)
      setNewName('')
      toast.success(`Added "${name}"`)
    } catch (e) {
      toast.error(e.message)
    }
  }

  const removeExclusion = async (name) => {
    try {
      const res = await fetch('/api-admin/intelligence/exclusions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, action: 'remove' }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to remove')
        return
      }
      setExclusions(data.exclusions)
      toast.success(`Removed "${name}"`)
    } catch (e) {
      toast.error(e.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Enrichment Exclusions"
        description={`${exclusions.length} entities excluded from costly Kimi K2 deep research`}
      />

      <div className="mt-6 bg-white border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addExclusion()}
            placeholder="Add an entity to exclude (e.g. Jeff Bezos)"
            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button onClick={addExclusion} disabled={!newName.trim()} className="gap-1">
            <Plus className="w-4 h-4" /> Add
          </Button>
        </div>

        <div className="text-xs text-gray-500 mb-3">
          Entities in this list will be skipped during the expensive Kimi K2 deep enrichment step.
          Their events will still be created and notified — only the family office / business peer
          research is skipped.
        </div>

        {exclusions.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            <ShieldBan className="w-8 h-8 mx-auto mb-2 opacity-50" />
            No exclusions configured
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {exclusions.map((name) => (
              <div
                key={name}
                className="flex items-center justify-between bg-gray-50 border rounded-lg px-3 py-2 text-sm"
              >
                <span className="capitalize truncate">{name}</span>
                <button
                  onClick={() => removeExclusion(name)}
                  className="text-gray-400 hover:text-red-500 shrink-0 ml-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}