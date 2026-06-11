'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { PageHeader, Badge } from '@/components/shared'
import { Loader2, Landmark, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

const FILING_TYPE_COLORS = {
  '8-K': 'bg-blue-100 text-blue-800', '13D': 'bg-red-100 text-red-800',
  '13G': 'bg-orange-100 text-orange-800', 'Form 4': 'bg-purple-100 text-purple-800',
  'SC 13D': 'bg-red-100 text-red-800', 'SC 13G': 'bg-orange-100 text-orange-800',
  'DIRECTOR_APPOINTMENT': 'bg-green-100 text-green-800', 'SHARE_TRANSFER': 'bg-yellow-100 text-yellow-800',
  'CHARGE': 'bg-gray-100 text-gray-800', 'INSOLVENCY': 'bg-red-100 text-red-800',
}

function FilingTypeBadge({ type }) {
  const color = FILING_TYPE_COLORS[type] || 'bg-gray-100 text-gray-600'
  return <Badge className={color}>{type}</Badge>
}

export default function FilingsPage() {
  const [filings, setFilings] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    try {
      const res = await fetch('/api-admin/intelligence?type=filings&limit=100')
      if (!res.ok) throw new Error('Failed to load filings')
      setFilings(await res.json())
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

  return (
    <div className="p-6">
      <PageHeader
        title="Regulatory Filings"
        description={`${filings.length} filings tracked across SEC, Companies House, DK CVR`}
      />
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-3 font-medium">Filing Type</th>
              <th className="pb-3 font-medium">Company</th>
              <th className="pb-3 font-medium">Jurisdiction</th>
              <th className="pb-3 font-medium">Date</th>
              <th className="pb-3 font-medium">Subjects</th>
              <th className="pb-3 font-medium">Summary</th>
              <th className="pb-3 font-medium">Source</th>
            </tr>
          </thead>
          <tbody>
            {filings.map((f) => (
              <tr key={f._id} className="border-b hover:bg-gray-50 transition-colors">
                <td className="py-3"><FilingTypeBadge type={f.filingType} /></td>
                <td className="py-3 font-medium text-gray-900">{f.companyName}</td>
                <td className="py-3">
                  <Badge variant="outline">{f.jurisdiction?.replace('_', ' ').toUpperCase()}</Badge>
                </td>
                <td className="py-3 text-gray-500">
                  {f.filingDate ? new Date(f.filingDate).toLocaleDateString() : '-'}
                </td>
                <td className="py-3">
                  <div className="flex flex-wrap gap-1">
                    {(f.subjects || []).slice(0, 3).map((s, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                </td>
                <td className="py-3 max-w-xs truncate text-gray-600">
                  {f.aiSummary || '-'}
                </td>
                <td className="py-3">
                  {f.sourceUrl ? (
                    <a href={f.sourceUrl} target="_blank" rel="noopener noreferrer"
                       className="text-blue-600 hover:underline inline-flex items-center gap-1">
                      View <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}