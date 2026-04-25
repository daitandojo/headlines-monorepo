// apps/client/src/app/api/admin/individuals/research/route.js
'use server'

import { NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/auth/server'
import { enrichOpportunityWithPriority } from '@headlines/ai-services/next'
import { extensiveEnrichmentChain } from '@headlines/ai-services/next'
import { Opportunity } from '@headlines/models/next'
import dbConnect from '@headlines/data-access/dbConnect/next'

const UHNW_THRESHOLD_MM = 30

function markUnverified(obj, source) {
  if (obj && typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      if (obj[key] !== null && obj[key] !== undefined) {
        if (typeof obj[key] === 'object') {
          markUnverified(obj[key], source)
        } else if (!obj._source) {
          obj._source = source
        }
      }
    }
  }
  return obj
}

const handlePost = async (request) => {
  const { isAdmin, error } = await verifyAdmin()
  if (!isAdmin) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { name, company } = body

  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'Name is required.' }, { status: 400 })
  }

  await dbConnect()

  const seed = {
    reachOutTo: name.trim(),
    type: 'beneficiary',
    triggerClass: 'TC12_INDIVIDUAL_LIST',
    contactDetails: company ? { company } : {},
    profile: {},
    accessPath: { conduits: [] },
    whyContact: [],
    relatedIndividuals: [],
  }

  try {
    const enriched = await enrichOpportunityWithPriority(seed, null)

    if (enriched.profile?.estimatedNetWorthMM < UHNW_THRESHOLD_MM) {
      enriched._uhnwStatus = 'below_threshold'
      enriched._uhnwThresholdMM = UHNW_THRESHOLD_MM
    } else {
      enriched._uhnwStatus = 'pass'
      enriched._uhnwThresholdMM = UHNW_THRESHOLD_MM
    }

    markUnverified(enriched.profile, 'enrichment_step_1')
    markUnverified(enriched.accessPath, 'enrichment_step_1')

    let familyNetwork = null
    try {
      const kimiResult = await extensiveEnrichmentChain({
        name: name.trim(),
        company: company || null,
        currentContext: enriched.profile?.biography || null,
      })

      if (kimiResult && !kimiResult.error) {
        const ee = kimiResult.extensive_enrichment || {}
        familyNetwork = {
          family_members: (ee.family_members || []).map((m) => ({ ...m, _source: 'kimi_research' })),
          business_peers: (ee.business_peers || []).map((m) => ({ ...m, _source: 'kimi_research' })),
          related_wealthy: (ee.related_wealthy || []).map((m) => ({ ...m, _source: 'kimi_research' })),
        }

        if (ee.seed_person) {
          enriched.profile = { ...enriched.profile, ...ee.seed_person }
          markUnverified(enriched.profile, 'kimi_research')
        }
        if (ee.access_path) {
          enriched.accessPath = { ...enriched.accessPath, ...ee.access_path }
          markUnverified(enriched.accessPath, 'kimi_research')
        }
      }
    } catch (kimiErr) {
      enriched._researchWarning = `Family network research failed: ${kimiErr.message}`
    }

    return NextResponse.json({
      success: true,
      individual: enriched,
      familyNetwork,
      uhnwGate: {
        thresholdMM: UHNW_THRESHOLD_MM,
        status: enriched._uhnwStatus,
        netWorthMM: enriched.profile?.estimatedNetWorthMM || 0,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export const POST = handlePost