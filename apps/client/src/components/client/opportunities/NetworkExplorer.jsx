// apps/client/src/components/client/opportunities/NetworkExplorer.jsx
'use client'

import { useQuery } from '@tanstack/react-query'
import { Skeleton } from '@/components/shared'
import {
  Share2,
  Users,
  Briefcase,
  Building,
  Link as LinkIcon,
  AlertTriangle,
} from 'lucide-react'

async function fetchEntityGraph(entityName) {
  const res = await fetch(`/api/entity-graph/${encodeURIComponent(entityName)}`)
  if (!res.ok) {
    if (res.status === 404) return null // Not an error, just no data
    const errorData = await res.json()
    throw new Error(errorData.error || 'Failed to fetch network data')
  }
  const result = await res.json()
  return result.data
}

const RelationshipGroup = ({ title, relationships, icon: Icon }) => {
  if (!relationships || relationships.length === 0) return null

  return (
    <div>
      <h4 className="text-sm font-semibold text-slate-400 mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4" />
        {title}
      </h4>
      <div className="pl-6 space-y-2">
        {relationships.map((rel, index) => (
          <div key={index} className="text-sm text-slate-300">
            <span className="font-semibold">{rel.type}</span>: {rel.targetName}
            {rel.context && (
              <p className="text-xs text-slate-500 italic pl-2">{rel.context}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export function NetworkExplorer({ entityName }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['entity-graph', entityName],
    queryFn: () => fetchEntityGraph(entityName),
    enabled: !!entityName,
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center text-center text-red-400 bg-red-500/10 p-4 rounded-lg">
        <AlertTriangle className="h-8 w-8 mb-2" />
        <p className="font-semibold">Could not load network data.</p>
        <p className="text-xs">{error.message}</p>
      </div>
    )
  }

  if (!data || !data.relationships || data.relationships.length === 0) {
    return (
      <div className="text-center text-slate-500 italic py-8">
        No network relationships have been discovered for this entity yet.
      </div>
    )
  }

  const corporateRoles = data.relationships.filter((r) =>
    ['Founder Of', 'CEO Of', 'Chairman Of', 'Board Member Of'].includes(r.type)
  )
  const ownership = data.relationships.filter((r) =>
    ['Owner Of', 'Majority Shareholder Of', 'Minority Shareholder Of'].includes(r.type)
  )
  const transactions = data.relationships.filter((r) =>
    ['Acquired', 'Invested In', 'Partnered With'].includes(r.type)
  )
  const familyTies = data.relationships.filter((r) => r.type === 'Family Member Of')

  return (
    <div className="space-y-6">
      <RelationshipGroup
        title="Corporate Roles & Positions"
        relationships={corporateRoles}
        icon={Briefcase}
      />
      <RelationshipGroup
        title="Ownership & Holdings"
        relationships={ownership}
        icon={Building}
      />
      <RelationshipGroup
        title="Transactions & Partnerships"
        relationships={transactions}
        icon={LinkIcon}
      />
      <RelationshipGroup
        title="Family & Associates"
        relationships={familyTies}
        icon={Users}
      />
    </div>
  )
}
