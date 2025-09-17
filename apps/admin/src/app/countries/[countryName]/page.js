// src/app/countries/[countryName]/page.js (version 1.3)
'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Loader2, ServerCrash, Wand2, PlusCircle, Edit } from 'lucide-react'
import { Button } from '@headlines/ui'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@headlines/ui'
import { Badge } from '@headlines/ui'
import { Separator } from '@headlines/ui'
import { toast } from 'sonner'
import { useEntityManager } from '@/hooks/use-entity-manager'

const SourceListCard = ({ title, sources, onAction, actionType }) => (
  <Card className="bg-black/20 border-white/10">
    <CardHeader>
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardContent>
      {sources && sources.length > 0 ? (
        <ul className="space-y-3">
          {sources.map((source, index) => (
            <li key={index} className="flex items-center justify-between">
              <div>
                <p className="font-medium">{source.name}</p>
                <a
                  href={source.url || source.sectionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:underline"
                >
                  {source.url || source.sectionUrl}
                </a>
              </div>
              <Button size="sm" variant="outline" onClick={() => onAction(source)}>
                {actionType === 'add' ? (
                  <PlusCircle className="h-4 w-4 mr-2" />
                ) : (
                  <Edit className="h-4 w-4 mr-2" />
                )}
                {actionType === 'add' ? 'Add' : 'Edit'}
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No sources in this category.</p>
      )}
    </CardContent>
  </Card>
)

export default function CountryDetailPage({ params }) {
  const countryName = decodeURIComponent(params.countryName)
  const router = useRouter()
  const [suggestions, setSuggestions] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const { entities: allSources, isLoading: isLoadingSources } = useEntityManager(
    '/api/sources',
    'Source',
    'name'
  )

  const onboardedSources = useMemo(() => {
    if (!allSources) return []
    return allSources.filter((s) => s.country === countryName)
  }, [allSources, countryName])

  const handleDiscover = async () => {
    setIsLoading(true)
    setError(null)
    const toastId = toast.loading(
      `AI is discovering additional sources for ${countryName}...`
    )
    try {
      const res = await fetch('/api/ai/discover-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          country: countryName,
          existingSources: onboardedSources.map((s) => s.name),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.details || 'Failed to discover sources.')
      setSuggestions(data.suggestions)
      toast.success('Source discovery complete!', { id: toastId })
    } catch (err) {
      setError(err.message)
      toast.error('Discovery Failed', { id: toastId, description: err.message })
    } finally {
      setIsLoading(false)
    }
  }

  // CORRECTIVE ACTION: This now correctly navigates to the Sources page
  // and passes all necessary data via query params to pre-populate the editor.
  const handleAddSource = (source) => {
    const query = new URLSearchParams({
      action: 'add',
      name: source.name,
      country: countryName,
      sectionUrl: source.url,
      baseUrl: new URL(source.url).origin,
    }).toString()
    router.push(`/?${query}`)
  }

  const handleEditSource = (source) => {
    const query = new URLSearchParams({
      action: 'edit',
      sourceId: source._id,
    }).toString()
    router.push(`/?${query}`)
  }

  const allSuggestions = suggestions
    ? [
        ...(suggestions.financial_news || []),
        ...(suggestions.pe_vc_news || []),
        ...(suggestions.ma_news || []),
      ]
    : []

  if (isLoadingSources) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-12 h-12 animate-spin gemini-text" />
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Button asChild variant="ghost" className="mb-4">
        <Link href="/countries">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Countries
        </Link>
      </Button>
      <Card className="bg-black/20 border-white/10 mb-8">
        <CardHeader>
          <CardTitle className="text-3xl">Source Hub: {countryName}</CardTitle>
          <CardDescription>
            Manage existing sources or use AI to discover new ones for this country.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleDiscover} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" />
            )}
            {isLoading ? 'Discovering...' : 'Discover Additional Sources with AI'}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <SourceListCard
          title="Onboarded Sources"
          sources={onboardedSources}
          onAction={handleEditSource}
          actionType="edit"
        />
        <Separator />
        {error && (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/50 text-destructive-foreground">
            <p>{error}</p>
          </div>
        )}
        {suggestions && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <SourceListCard
              title="AI-Suggested New Sources"
              sources={allSuggestions}
              onAction={handleAddSource}
              actionType="add"
            />
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
