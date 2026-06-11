'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { PageHeader, Badge } from '@/components/shared'
import { Loader2, Building2, DollarSign } from 'lucide-react'
import { toast } from 'sonner'

export default function OwnershipStakesPage() {
  const [stakes, setStakes] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    try {
      const res = await fetch('/api-admin/intelligence?type=ownership')
      if (!res.ok) throw new Error('Failed to load ownership stakes')
      setStakes(await res.json())
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

  const totalValue = stakes.reduce((s, st) => s + (st.estimatedValueUSD_MM || 0), 0)

  return (
    <div className="p-6">
      <PageHeader
        title="Ownership Stakes"
        description={`${stakes.length} tracked stakes — total estimated value: $${totalValue.toFixed(0)}M`}
      />
      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Building2 className="w-4 h-4" /> Tracked Stakes
          </div>
          <div className="text-2xl font-bold mt-1">{stakes.length}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-gray-500 text-sm">Total Estimated Value</div>
          <div className="text-2xl font-bold mt-1">${totalValue.toFixed(0)}M</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-gray-500 text-sm">Verified</div>
          <div className="text-2xl font-bold mt-1 text-green-600">
            {stakes.filter(s => s.isVerified).length}
          </div>
        </div>
      </div>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-3 font-medium">Entity</th>
              <th className="pb-3 font-medium">Company</th>
              <th className="pb-3 font-medium">Ownership</th>
              <th className="pb-3 font-medium">Type</th>
              <th className="pb-3 font-medium">Est. Value</th>
              <th className="pb-3 font-medium">Confidence</th>
              <th className="pb-3 font-medium">Source</th>
            </tr>
          </thead>
          <tbody>
            {stakes.map((st) => (
              <tr key={st._id} className="border-b hover:bg-gray-50 transition-colors">
                <td className="py-3 font-medium text-gray-900">{st.entityName}</td>
                <td className="py-3 text-gray-700">{st.companyName}</td>
                <td className="py-3">
                  <span className="font-semibold">{st.percentage != null ? `${st.percentage}%` : '-'}</span>
                </td>
                <td className="py-3">
                  <Badge variant="outline" className="text-xs">
                    {st.stakeType?.replace(/_/g, ' ')}
                  </Badge>
                </td>
                <td className="py-3">
                  <span className="flex items-center gap-1 font-semibold text-green-700">
                    <DollarSign className="w-3 h-3" />
                    {st.estimatedValueUSD_MM?.toFixed(0) || '-'}M
                  </span>
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div className={`h-2 rounded-full ${
                        st.confidence >= 70 ? 'bg-green-500' : st.confidence >= 40 ? 'bg-yellow-500' : 'bg-gray-400'
                      }`} style={{ width: `${st.confidence || 0}%` }} />
                    </div>
                    <span className="text-xs text-gray-500">{st.confidence || 0}%</span>
                  </div>
                </td>
                <td className="py-3 text-xs text-gray-500 max-w-[200px] truncate">{st.source || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}