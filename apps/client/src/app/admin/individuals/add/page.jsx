// apps/client/src/app/admin/individuals/add/page.jsx
'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'
import { Input, Button, Label, Badge } from '@/components/shared'
import { Search, Brain, Save, ArrowRight, AlertTriangle, Shield, CheckCircle2, Loader2, User, X } from 'lucide-react'

function ResearchResults({ individual, familyNetwork }) {
  const fields = [
    { key: 'reachOutTo', label: 'Name' },
    { key: 'company', label: 'Company', path: 'contactDetails' },
    { key: 'role', label: 'Role', path: 'contactDetails' },
    { key: 'email', label: 'Email', path: 'contactDetails' },
    { key: 'basedIn', label: 'Based In', format: (v) => (Array.isArray(v) ? v.join(', ') : v) },
    { key: 'estimatedNetWorthMM', label: 'Net Worth', path: 'profile', format: (v) => v ? `$${v}M` : null },
    { key: 'biography', label: 'Biography', path: 'profile' },
    { key: 'wealthOrigin', label: 'Wealth Origin', path: 'profile' },
    { key: 'sector', label: 'Sector', path: 'profile' },
    { key: 'familyOffice', label: 'Family Office', path: 'accessPath' },
    { key: 'incumbentWM', label: 'Incumbent WM', path: 'accessPath' },
  ]

  return (
    <div className="space-y-6">
      {/* UHNW Gate */}
      <div className="flex items-center gap-3 p-4 rounded-lg border">
        {individual._uhnwStatus === 'pass' ? (
          <>
            <CheckCircle2 className="h-6 w-6 text-green-400 flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-300">
                UHNW Threshold Passed — ${individual.profile?.estimatedNetWorthMM}M
              </p>
              <p className="text-sm text-slate-400">
                Above the ${individual._uhnwThresholdMM}M UHNW gate. Eligible for ingestion.
              </p>
            </div>
          </>
        ) : (
          <>
            <AlertTriangle className="h-6 w-6 text-amber-400 flex-shrink-0" />
            <div>
              <p className="font-semibold text-amber-300">
                Below UHNW Threshold — ${individual.profile?.estimatedNetWorthMM || 0}M
              </p>
              <p className="text-sm text-slate-400">
                Below the ${individual._uhnwThresholdMM}M gate. Manual override required to save.
              </p>
            </div>
          </>
        )}
      </div>

      {/* Profile Fields */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
          Researched Profile
        </h3>
        {fields.map(({ key, label, path, format }) => {
          let value = path ? individual[path]?.[key] : individual[key]
          if (format) value = format(value)
          if (!value) return null
          return (
            <div key={key} className="grid grid-cols-4 gap-3 text-sm">
              <span className="text-slate-500">{label}</span>
              <span className="col-span-3 text-slate-200">{String(value)}</span>
            </div>
          )
        })}
      </div>

      {/* Family Network */}
      {familyNetwork && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
            Discovered Connections
          </h3>
          {familyNetwork.family_members?.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 mb-2">Family Members</p>
              <div className="flex flex-wrap gap-2">
                {familyNetwork.family_members.map((m, i) => (
                  <Badge key={i} variant="outline" className="text-slate-300 border-slate-600">
                    {m.full_name}
                    {m.relationship && <span className="text-slate-500 ml-1">({m.relationship})</span>}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {familyNetwork.business_peers?.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 mb-2">Business Peers</p>
              <div className="flex flex-wrap gap-2">
                {familyNetwork.business_peers.map((m, i) => (
                  <Badge key={i} variant="outline" className="text-slate-300 border-slate-600">
                    {m.full_name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {familyNetwork.related_wealthy?.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 mb-2">Related Wealthy</p>
              <div className="flex flex-wrap gap-2">
                {familyNetwork.related_wealthy.map((m, i) => (
                  <Badge key={i} variant="outline" className="text-slate-300 border-slate-600">
                    {m.full_name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {individual._researchWarning && (
        <p className="text-sm text-amber-400 bg-amber-900/20 p-3 rounded border border-amber-500/30">
          <AlertTriangle className="inline h-4 w-4 mr-2" />
          {individual._researchWarning}
        </p>
      )}
    </div>
  )
}

export default function AddIndividualPage() {
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [existing, setExisting] = useState(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isResearching, setIsResearching] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [researchResult, setResearchResult] = useState(null)

  const handleSearch = async () => {
    if (!name.trim()) return
    setIsSearching(true)
    setExisting(null)
    setResearchResult(null)

    try {
      const res = await fetch('/api/admin/individuals/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, company }),
      })
      const data = await res.json()
      if (data.matches?.length > 0) {
        setExisting(data.matches[0])
      } else {
        setStep(2)
      }
    } catch {
      setStep(2)
    } finally {
      setIsSearching(false)
    }
  }

  const handleResearch = async () => {
    setIsResearching(true)
    try {
      const res = await fetch('/api/admin/individuals/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, company }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResearchResult(data)
      setStep(3)
    } catch (err) {
      toast.error('Research failed', { description: err.message })
    } finally {
      setIsResearching(false)
    }
  }

  const handleSave = async (overrideUhnw = false) => {
    setIsSaving(true)
    try {
      const payload = {
        reachOutTo: researchResult.individual.reachOutTo,
        type: 'beneficiary',
        triggerClass: 'TC12_INDIVIDUAL_LIST',
        triggerSummary: 'Manually added and researched by admin.',
        contactDetails: researchResult.individual.contactDetails,
        profile: researchResult.individual.profile,
        accessPath: researchResult.individual.accessPath,
        relatedIndividuals: (researchResult.familyNetwork?.family_members || []).map((m) => ({
          name: m.full_name,
          relationship: m.relationship || 'family',
          type: 'family',
          notes: m.notes || null,
        })),
        basedIn: researchResult.individual.basedIn,
        priority: researchResult.individual.priority || 'medium',
        lastKnownEventLiquidityMM: researchResult.individual.profile?.estimatedNetWorthMM || 0,
        _overrideUhnw: overrideUhnw,
      }

      const res = await fetch('/api/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (data.error && !data.existingId) throw new Error(data.error)

      if (data.existingId) {
        toast.info('This person already exists.', {
          description: 'Open the existing record to update it manually.',
        })
      } else {
        toast.success('Individual saved', {
          description: `${researchResult.individual.reachOutTo} added to the database.`,
        })
        setStep(4)
      }
    } catch (err) {
      toast.error('Save failed', { description: err.message })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Add UHNW Individual</h1>
        <div className="flex gap-2">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={`h-2 w-8 rounded-full ${
                n <= step ? 'bg-blue-500' : 'bg-slate-700'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Step 1: Search */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="space-y-3">
            <Label htmlFor="name">Person Name</Label>
            <Input
              id="name"
              placeholder="e.g. Sigrid Gjerstad"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="h-12 text-base"
            />
          </div>
          <div className="space-y-3">
            <Label htmlFor="company">Company / Context (optional)</Label>
            <Input
              id="company"
              placeholder="e.g. Aker"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="h-12"
            />
          </div>

          {existing ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-500/40 bg-amber-900/20">
                <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-amber-300">Person already in database</p>
                  <p className="text-sm text-slate-400 mt-1">
                    <strong>{existing.reachOutTo}</strong>
                    {existing.contactDetails?.company && (
                      <span> — {existing.contactDetails.company}</span>
                    )}
                    {existing.profile?.estimatedNetWorthMM && (
                      <span> — ${existing.profile.estimatedNetWorthMM}M</span>
                    )}
                  </p>
                </div>
              </div>
              <Link href={`/opportunities/${existing._id}`}>
                <Button variant="outline" className="w-full">
                  View Existing Record
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          ) : (
            <Button onClick={handleSearch} disabled={isSearching || !name.trim()} size="lg" className="w-full">
              {isSearching ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <Search className="h-5 w-5 mr-2" />
              )}
              Search Database
            </Button>
          )}
        </div>
      )}

      {/* Step 2: Research */}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-slate-400">
            <strong className="text-slate-200">{name}</strong> not found in the database. Research this
            person to build a profile.
          </p>
          <Button
            onClick={handleResearch}
            disabled={isResearching}
            size="lg"
            className="w-full bg-blue-600 hover:bg-blue-500"
          >
            {isResearching ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : (
              <Brain className="h-5 w-5 mr-2" />
            )}
            Research This Person
          </Button>
          <Button
            variant="ghost"
            onClick={() => setStep(1)}
            className="w-full"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      )}

      {/* Step 3: Review & Save */}
      {step === 3 && researchResult && (
        <div className="space-y-6">
          <ResearchResults
            individual={researchResult.individual}
            familyNetwork={researchResult.familyNetwork}
          />
          <div className="flex gap-3">
            <Button
              onClick={() => handleSave(false)}
              disabled={isSaving}
              size="lg"
              className="flex-1"
            >
              {isSaving ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <Save className="h-5 w-5 mr-2" />
              )}
              Save to Database
            </Button>
            {researchResult.uhnwGate.status !== 'pass' && (
              <Button
                onClick={() => handleSave(true)}
                disabled={isSaving}
                size="lg"
                variant="outline"
                className="flex-1"
                title="Below UHNW threshold — save only if you have verified intel"
              >
                Save Below Threshold
              </Button>
            )}
          </div>
          <Button
            variant="ghost"
            onClick={() => { setStep(2); setResearchResult(null) }}
            className="w-full"
          >
            <Brain className="h-4 w-4 mr-2" />
            Research Again
          </Button>
        </div>
      )}

      {/* Step 4: Success */}
      {step === 4 && (
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-400" />
          <p className="text-xl font-bold text-slate-100">Individual Saved</p>
          <Link href="/admin/individuals/add">
            <Button onClick={() => { setStep(1); setName(''); setCompany(''); setExisting(null); setResearchResult(null) }}>
              Add Another
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}