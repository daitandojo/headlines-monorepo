'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { PageHeader, Badge, Button, LoadingOverlay } from '@/components/shared'
import { Loader2, RefreshCw, Activity } from 'lucide-react'
import { toast } from 'sonner'

function HealthBadge({ status, successRate }) {
  if (status === 'paused') return <Badge className="bg-gray-200 text-gray-700">Paused</Badge>
  if (successRate >= 80) return <Badge className="bg-green-100 text-green-800 border-green-300">Healthy</Badge>
  if (successRate >= 50) return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Warning</Badge>
  return <Badge className="bg-red-100 text-red-800 border-red-300">Critical</Badge>
}

export default function SourceHealthPage() {
  const [sources, setSources] = useState([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(new Set())

  const fetchSources = useCallback(async () => {
    try {
      const res = await fetch('/api-admin/intelligence?type=sources')
      if (!res.ok) throw new Error('Failed to load sources')
      setSources(await res.json())
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSources() }, [fetchSources])

  const toggleSource = async (id, name) => {
    setToggling(s => new Set([...s, id]))
    try {
      const res = await fetch('/api-admin/intelligence', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_source', targetId: id }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setSources(prev => prev.map(s => s._id === id ? { ...s, status: data.newStatus } : s))
      toast.success(`${name} ${data.newStatus === 'active' ? 'activated' : 'paused'}`)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setToggling(s => { const n = new Set(s); n.delete(id); return n })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  const total = sources.length
  const active = sources.filter(s => s.status === 'active').length
  const paused = sources.filter(s => s.status === 'paused').length

  return (
    <div className="p-6">
      <PageHeader
        title="Source Health Matrix"
        description={`${total} sources — ${active} active, ${paused} paused`}
      >
        <Button variant="outline" size="sm" onClick={fetchSources}>
          <RefreshCw className="w-4 h-4 mr-1" /> Refresh
        </Button>
      </PageHeader>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-3 font-medium">Source</th>
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3 font-medium">Healing Actions</th>
              <th className="pb-3 font-medium">Last Scraped</th>
              <th className="pb-3 font-medium">Created</th>
              <th className="pb-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((source) => (
              <tr key={source._id} className="border-b hover:bg-gray-50 transition-colors">
                <td className="py-3 font-medium text-gray-900">{source.name}</td>
                <td className="py-3"><HealthBadge status={source.status} successRate={source.healingActions > 0 ? 0 : 100} /></td>
                <td className="py-3">
                  <span className={`inline-flex items-center gap-1 text-xs ${source.healingActions > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>
                    <Activity className="w-3 h-3" />
                    {source.healingActions || 0}
                  </span>
                </td>
                <td className="py-3 text-gray-500">{source.lastScrapedAt ? new Date(source.lastScrapedAt).toLocaleDateString() : 'Never'}</td>
                <td className="py-3 text-gray-500">{new Date(source.createdAt).toLocaleDateString()}</td>
                <td className="py-3">
                  <Button
                    variant={source.status === 'paused' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleSource(source._id, source.name)}
                    disabled={toggling.has(source._id)}
                  >
                    {toggling.has(source._id) ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : source.status === 'paused' ? 'Activate' : 'Pause'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}