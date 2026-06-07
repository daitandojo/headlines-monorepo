'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { PageHeader, Badge } from '@/components/shared'
import { Loader2, Scale, Globe, Users, Building2 } from 'lucide-react'
import { toast } from 'sonner'

const CONFIDENCE_COLORS = {
  confirmed: 'bg-green-100 text-green-800 border-green-300',
  probable: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  possible: 'bg-gray-100 text-gray-600 border-gray-300',
}

const FO_TYPE_LABELS = {
  single_family: 'Single-Family',
  multi_family: 'Multi-Family',
  virtual: 'Virtual',
  embedded: 'Embedded',
  unknown: 'Unknown',
}

export default function FamilyOfficesPage() {
  const [fos, setFos] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    try {
      const res = await fetch('/api-admin/intelligence?type=family-offices')
      if (!res.ok) throw new Error('Failed to load family offices')
      setFos(await res.json())
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

  const totalAUM = fos.reduce((s, fo) => s + (fo.estimatedAUM_USD_MM || 0), 0)

  return (
    <div className="p-6">
      <PageHeader
        title="Family Office Directory"
        description={`${fos.length} family offices — $${totalAUM.toFixed(0)}M known AUM`}
      />
      <div className="grid grid-cols-4 gap-4 mt-6">
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Scale className="w-4 h-4" /> Total FOs
          </div>
          <div className="text-2xl font-bold mt-1">{fos.length}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Building2 className="w-4 h-4" /> Single-Family
          </div>
          <div className="text-2xl font-bold mt-1">
            {fos.filter(f => f.investmentType === 'single_family').length}
          </div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Users className="w-4 h-4" /> Multi-Family
          </div>
          <div className="text-2xl font-bold mt-1">
            {fos.filter(f => f.investmentType === 'multi_family').length}
          </div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Globe className="w-4 h-4" /> Countries
          </div>
          <div className="text-2xl font-bold mt-1">
            {new Set(fos.map(f => f.country).filter(Boolean)).size}
          </div>
        </div>
      </div>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-3 font-medium">Name</th>
              <th className="pb-3 font-medium">Type</th>
              <th className="pb-3 font-medium">Location</th>
              <th className="pb-3 font-medium">AUM (USD)</th>
              <th className="pb-3 font-medium">Known Clients</th>
              <th className="pb-3 font-medium">Focus</th>
              <th className="pb-3 font-medium">Confidence</th>
            </tr>
          </thead>
          <tbody>
            {fos.map((fo) => (
              <tr key={fo._id} className="border-b hover:bg-gray-50 transition-colors">
                <td className="py-3 font-medium text-gray-900">{fo.name}</td>
                <td className="py-3">
                  <Badge variant="outline" className="text-xs">
                    {FO_TYPE_LABELS[fo.investmentType] || fo.investmentType}
                  </Badge>
                </td>
                <td className="py-3 text-gray-600">
                  {fo.location}{fo.country ? `, ${fo.country}` : ''}
                </td>
                <td className="py-3 font-semibold">
                  {fo.estimatedAUM_USD_MM != null
                    ? `$${fo.estimatedAUM_USD_MM.toFixed(0)}M`
                    : '-'}
                </td>
                <td className="py-3">
                  <div className="flex flex-wrap gap-1">
                    {(fo.clientNames || []).slice(0, 3).map((c, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{c}</Badge>
                    ))}
                    {(fo.clientNames || []).length > 3 && (
                      <span className="text-xs text-gray-400">+{fo.clientNames.length - 3}</span>
                    )}
                  </div>
                </td>
                <td className="py-3 max-w-[200px]">
                  <div className="flex flex-wrap gap-1">
                    {(fo.investmentFocus || []).slice(0, 3).map((f, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{f}</Badge>
                    ))}
                  </div>
                </td>
                <td className="py-3">
                  <Badge className={CONFIDENCE_COLORS[fo.confidence] || 'bg-gray-100 text-gray-600'}>
                    {fo.confidence}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}