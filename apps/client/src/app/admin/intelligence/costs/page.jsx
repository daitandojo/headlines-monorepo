'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '@/components/shared'
import { Loader2, DollarSign } from 'lucide-react'
import { toast } from 'sonner'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function CostsPage() {
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchCosts = useCallback(async () => {
    try {
      const res = await fetch('/api-admin/intelligence?type=costs')
      if (!res.ok) throw new Error('Failed to load cost data')
      setRuns(await res.json())
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCosts() }, [fetchCosts])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  const chartData = runs.map(r => ({
    date: new Date(r.createdAt).toLocaleDateString(),
    tokens: r.tokenTracker?.gpt4o?.totalTokens || 0,
    cost: r.tokenTracker?.gpt4o?.totalCost || 0,
  })).reverse()

  const totalCost = chartData.reduce((s, r) => s + r.cost, 0)
  const totalTokens = chartData.reduce((s, r) => s + r.tokens, 0)

  return (
    <div className="p-6">
      <PageHeader
        title="Cost Center"
        description={`Last ${runs.length} runs: $${totalCost.toFixed(2)} total, ${(totalTokens / 1000000).toFixed(1)}M tokens`}
      />

      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <DollarSign className="w-4 h-4" />
            Total API Cost
          </div>
          <div className="text-2xl font-bold mt-1">${totalCost.toFixed(2)}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-gray-500 text-sm">Total Tokens</div>
          <div className="text-2xl font-bold mt-1">{(totalTokens / 1000000).toFixed(1)}M</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-gray-500 text-sm">Avg Per Run</div>
          <div className="text-2xl font-bold mt-1">
            ${runs.length > 0 ? (totalCost / runs.length).toFixed(4) : '0.00'}
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white border rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Token Usage Per Run</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="tokens" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}