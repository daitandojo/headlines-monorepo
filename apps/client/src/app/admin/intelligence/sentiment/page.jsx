'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { PageHeader, Badge } from '@/components/shared'
import { Loader2, Thermometer, Activity, Clock, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function SentimentPage() {
  const [opportunities, setOpportunities] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    try {
      const res = await fetch('/api-admin/intelligence?type=sentiment')
      if (!res.ok) throw new Error('Failed to load sentiment data')
      setOpportunities(await res.json())
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  const hot = opportunities.filter(o => o.confidenceScore >= 60)
  const warm = opportunities.filter(o => o.confidenceScore >= 30 && o.confidenceScore < 60)
  const cold = opportunities.filter(o => o.confidenceScore < 30 && o.confidenceScore > 0)
  const cooled = opportunities.filter(o => o.coolingSince)

  const chartData = [
    { name: 'Hot (60+)', value: hot.length, fill: '#22c55e' },
    { name: 'Warm (30-59)', value: warm.length, fill: '#eab308' },
    { name: 'Cold (<30)', value: cold.length, fill: '#6b7280' },
    { name: 'Cooled', value: cooled.length, fill: '#ef4444' },
  ]

  return (
    <div className="p-6">
      <PageHeader
        title="Opportunity Sentiment & Confidence"
        description={`${opportunities.length} scored opportunities — ${hot.length} hot, ${cooled.length} cooled`}
      />
      <div className="grid grid-cols-4 gap-4 mt-6">
        <div className="bg-white border rounded-lg p-4 border-green-300">
          <div className="flex items-center gap-2 text-green-600 text-sm">
            <Activity className="w-4 h-4" /> Hot
          </div>
          <div className="text-2xl font-bold mt-1 text-green-700">{hot.length}</div>
        </div>
        <div className="bg-white border rounded-lg p-4 border-yellow-300">
          <div className="flex items-center gap-2 text-yellow-600 text-sm">
            <Thermometer className="w-4 h-4" /> Warm
          </div>
          <div className="text-2xl font-bold mt-1 text-yellow-700">{warm.length}</div>
        </div>
        <div className="bg-white border rounded-lg p-4 border-gray-300">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Clock className="w-4 h-4" /> Cold
          </div>
          <div className="text-2xl font-bold mt-1 text-gray-600">{cold.length}</div>
        </div>
        <div className="bg-white border rounded-lg p-4 border-red-300">
          <div className="flex items-center gap-2 text-red-600 text-sm">
            <CheckCircle2 className="w-4 h-4" /> Cooled (Decayed)
          </div>
          <div className="text-2xl font-bold mt-1 text-red-700">{cooled.length}</div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-6">
        <div className="bg-white border rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Confidence Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Recent Hot Opportunities</h3>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {hot.slice(0, 10).map(o => (
              <div key={o._id} className="flex items-center justify-between p-2 bg-green-50 rounded">
                <div>
                  <div className="text-sm font-medium text-gray-900">{o.reachOutTo}</div>
                  <div className="text-xs text-gray-500">
                    {o.corroborationCount} signals · Last: {o.lastSignalDate ? new Date(o.lastSignalDate).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
                <div className="text-lg font-bold text-green-700">{o.confidenceScore}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-3 font-medium">Opportunity</th>
              <th className="pb-3 font-medium">Confidence</th>
              <th className="pb-3 font-medium">Priority</th>
              <th className="pb-3 font-medium">Signals</th>
              <th className="pb-3 font-medium">Last Signal</th>
              <th className="pb-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {opportunities.map((o) => (
              <tr key={o._id} className="border-b hover:bg-gray-50 transition-colors">
                <td className="py-3 font-medium text-gray-900">{o.reachOutTo}</td>
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div className={`h-2 rounded-full ${
                        o.confidenceScore >= 60 ? 'bg-green-500' :
                        o.confidenceScore >= 30 ? 'bg-yellow-500' : 'bg-gray-400'
                      }`} style={{ width: `${o.confidenceScore || 0}%` }} />
                    </div>
                    <span className="font-semibold text-sm">{o.confidenceScore || 0}</span>
                  </div>
                </td>
                <td className="py-3">
                  <Badge className={
                    o.priority === 'high' ? 'bg-green-100 text-green-800' :
                    o.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-600'
                  }>{o.priority}</Badge>
                </td>
                <td className="py-3 text-gray-600">{o.corroborationCount || 0}</td>
                <td className="py-3 text-gray-500">
                  {o.lastSignalDate ? new Date(o.lastSignalDate).toLocaleDateString() : '-'}
                </td>
                <td className="py-3">
                  {o.coolingSince ? (
                    <Badge className="bg-red-100 text-red-800">Cooled</Badge>
                  ) : (
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}