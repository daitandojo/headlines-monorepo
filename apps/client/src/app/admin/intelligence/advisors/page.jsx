'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { PageHeader, Badge } from '@/components/shared'
import { Loader2, Handshake, Briefcase } from 'lucide-react'
import { toast } from 'sonner'

const FIRM_TYPE_COLORS = {
  legal: 'bg-red-100 text-red-800 border-red-200',
  financial: 'bg-blue-100 text-blue-800 border-blue-200',
  accounting: 'bg-green-100 text-green-800 border-green-200',
  consulting: 'bg-purple-100 text-purple-800 border-purple-200',
  strategic: 'bg-orange-100 text-orange-800 border-orange-200',
  pr: 'bg-pink-100 text-pink-800 border-pink-200',
}

export default function AdvisorsPage() {
  const [advisors, setAdvisors] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    try {
      const res = await fetch('/api-admin/intelligence?type=advisors')
      if (!res.ok) throw new Error('Failed to load advisors')
      setAdvisors(await res.json())
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

  const totalDeals = advisors.reduce((s, a) => s + (a.dealCount || 0), 0)

  return (
    <div className="p-6">
      <PageHeader
        title="Deal Advisors"
        description={`${advisors.length} firms involved in ${totalDeals} deals`}
      />
      <div className="grid grid-cols-4 gap-4 mt-6">
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Handshake className="w-4 h-4" /> Legal Firms
          </div>
          <div className="text-2xl font-bold mt-1">{advisors.filter(a => a.type === 'legal').length}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Briefcase className="w-4 h-4" /> Financial Advisors
          </div>
          <div className="text-2xl font-bold mt-1">{advisors.filter(a => a.type === 'financial').length}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-gray-500 text-sm">Accounting Firms</div>
          <div className="text-2xl font-bold mt-1">{advisors.filter(a => a.type === 'accounting').length}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-gray-500 text-sm">Consulting/Other</div>
          <div className="text-2xl font-bold mt-1">{advisors.filter(a => ['consulting', 'strategic', 'pr', 'other'].includes(a.type)).length}</div>
        </div>
      </div>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-3 font-medium">Firm</th>
              <th className="pb-3 font-medium">Type</th>
              <th className="pb-3 font-medium">Role</th>
              <th className="pb-3 font-medium">Deal Count</th>
              <th className="pb-3 font-medium">Last Active</th>
              <th className="pb-3 font-medium">Jurisdictions</th>
            </tr>
          </thead>
          <tbody>
            {advisors.map((a) => (
              <tr key={a._id} className="border-b hover:bg-gray-50 transition-colors">
                <td className="py-3 font-medium text-gray-900">{a.name}</td>
                <td className="py-3">
                  <Badge className={FIRM_TYPE_COLORS[a.type] || 'bg-gray-100 text-gray-700'}>
                    {a.type}
                  </Badge>
                </td>
                <td className="py-3 text-gray-600 text-xs">{a.role?.replace(/_/g, ' ') || '-'}</td>
                <td className="py-3">
                  <span className="font-semibold text-lg">{a.dealCount || 0}</span>
                </td>
                <td className="py-3 text-gray-500">
                  {a.lastDealDate ? new Date(a.lastDealDate).toLocaleDateString() : '-'}
                </td>
                <td className="py-3">
                  <div className="flex flex-wrap gap-1">
                    {(a.activeJurisdictions || []).map((j, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{j}</Badge>
                    ))}
                    {(!a.activeJurisdictions || a.activeJurisdictions.length === 0) && (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}