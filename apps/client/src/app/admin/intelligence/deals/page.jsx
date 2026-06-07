'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { PageHeader } from '@/components/shared'
import { Loader2, AlertCircle, TrendingUp, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { toast } from 'sonner'

const COLUMNS = [
  { status: 'rumor', label: 'Rumor', icon: AlertCircle, color: 'bg-yellow-100 border-yellow-400 text-yellow-800' },
  { status: 'announced', label: 'Announced', icon: TrendingUp, color: 'bg-blue-100 border-blue-400 text-blue-800' },
  { status: 'pending', label: 'Pending', icon: Clock, color: 'bg-purple-100 border-purple-400 text-purple-800' },
  { status: 'completed', label: 'Completed', icon: CheckCircle2, color: 'bg-green-100 border-green-400 text-green-800' },
  { status: 'cancelled', label: 'Cancelled', icon: XCircle, color: 'bg-gray-100 border-gray-400 text-gray-600' },
]

function DealCard({ deal, onDrop }) {
  const [dragging, setDragging] = useState(false)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      draggable
      onDragStart={() => setDragging(true)}
      onDragEnd={(e) => {
        setDragging(false)
        const target = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-status]')
        if (target) {
          const newStatus = target.dataset.status
          if (newStatus !== deal.status) onDrop(deal.id, newStatus)
        }
      }}
      className={`bg-white border rounded-lg p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow ${dragging ? 'opacity-50' : ''}`}
    >
      <div className="text-xs font-medium text-gray-500 mb-1">{deal.triggerClass || 'Event'}</div>
      <h3 className="text-sm font-semibold text-gray-900 leading-tight mb-2">{deal.headline}</h3>
      {deal.primarySubject?.name && (
        <div className="text-xs text-gray-600 mb-1">
          <span className="font-medium">Subject:</span> {deal.primarySubject.name}
        </div>
      )}
      {deal.transactionDetails?.valuationAtEventUSD && (
        <div className="text-xs font-semibold text-green-700">
          ${deal.transactionDetails.valuationAtEventUSD}M
        </div>
      )}
      <div className="text-xs text-gray-400 mt-2">
        {new Date(deal.createdAt).toLocaleDateString()}
      </div>
    </motion.div>
  )
}

export default function DealPipelinePage() {
  const [deals, setDeals] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchDeals = useCallback(async () => {
    try {
      const res = await fetch('/api-admin/intelligence?type=deals')
      if (!res.ok) throw new Error('Failed to load deals')
      setDeals(await res.json())
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchDeals() }, [fetchDeals])

  const handleDrop = async (dealId, newStatus) => {
    const prev = deals
    // Optimistic update
    setDeals(d => {
      if (!d) return d
      const updated = { ...d }
      for (const col of COLUMNS) {
        updated[col.status] = updated[col.status].filter(c => c.id !== dealId)
      }
      const moved = Object.values(prev).flat().find(c => c.id === dealId)
      if (moved) {
        moved.status = newStatus
        updated[newStatus] = [...(updated[newStatus] || []), moved]
      }
      return updated
    })
    try {
      const res = await fetch('/api-admin/intelligence', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_deal_status', targetId: dealId, value: newStatus }),
      })
      if (!res.ok) throw new Error('Failed to update')
      toast.success(`Deal moved to ${newStatus}`)
    } catch (e) {
      setDeals(prev)
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

  const totalDeals = deals ? Object.values(deals).reduce((sum, arr) => sum + arr.length, 0) : 0

  return (
    <div className="p-6">
      <PageHeader
        title="Deal Pipeline"
        description={`${totalDeals} active deals tracked across pipeline runs`}
      />
      <div className="grid grid-cols-5 gap-4 mt-6 min-h-[600px]">
        {COLUMNS.map(({ status, label, icon: Icon, color }) => {
          const items = deals?.[status] || []
          return (
            <div
              key={status}
              data-status={status}
              className={`rounded-lg border-2 p-3 ${color}`}
              onDragOver={(e) => e.preventDefault()}
            >
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-current/20">
                <Icon className="w-4 h-4" />
                <h2 className="font-semibold text-sm">{label}</h2>
                <span className="ml-auto text-xs font-bold">{items.length}</span>
              </div>
              <div className="space-y-2 min-h-[200px]">
                {items.length === 0 && (
                  <div className="text-xs text-center py-8 opacity-50">Drop deals here</div>
                )}
                {items.map(deal => (
                  <DealCard key={deal.id} deal={deal} onDrop={handleDrop} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}