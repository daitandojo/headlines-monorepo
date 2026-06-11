import { NextResponse } from 'next/server'
import dbConnect from '@headlines/data-access/dbConnect/next'
import { SynthesizedEvent, Source, HealingLog } from '@headlines/models/next'

export async function GET(request) {
  try {
    await dbConnect()

    const { searchParams } = request.nextUrl
    const type = searchParams.get('type') || 'deals'

    switch (type) {
      case 'deals': {
        const deals = await SynthesizedEvent.find({
          dealStatus: { $exists: true, $ne: null },
        })
          .select('synthesized_headline event_key dealStatus dealCloseDate createdAt triggerClass transactionDetails primarySubject relatedCompanies country')
          .sort({ createdAt: -1 })
          .limit(100)
          .lean()

        const grouped = { rumor: [], announced: [], pending: [], completed: [], cancelled: [] }
        for (const deal of deals) {
          const status = deal.dealStatus || 'pending'
          if (grouped[status]) {
            grouped[status].push({
              id: deal._id,
              event_key: deal.event_key,
              headline: deal.synthesized_headline,
              status: deal.dealStatus,
              dealCloseDate: deal.dealCloseDate,
              triggerClass: deal.triggerClass,
              primarySubject: deal.primarySubject,
              transactionDetails: deal.transactionDetails,
              relatedCompanies: deal.relatedCompanies,
              country: deal.country,
              createdAt: deal.createdAt,
            })
          }
        }

        return NextResponse.json(grouped)
      }

      case 'sources': {
        const sources = await Source.find({})
          .select('name status lastScrapedAt createdAt')
          .sort({ name: 1 })
          .lean()

        const healingLogs = await HealingLog.aggregate([
          { $match: { targetType: 'source' } },
          { $group: { _id: '$targetName', actions: { $sum: 1 }, lastAction: { $max: '$createdAt' } } },
        ])
        const healingMap = {}
        for (const log of healingLogs) {
          healingMap[log._id] = { healingActions: log.actions, lastHealing: log.lastAction }
        }

        const enriched = sources.map(s => ({
          ...s,
          ...(healingMap[s.name] || { healingActions: 0 }),
        }))
        return NextResponse.json(enriched)
      }

      case 'healing': {
        const logs = await HealingLog.find({})
          .sort({ createdAt: -1 })
          .limit(50)
          .lean()
        return NextResponse.json(logs)
      }

      case 'costs': {
        const runVerdicts = await import('@headlines/models/next').then(m => m.RunVerdict || null)
        if (!runVerdicts) return NextResponse.json({ error: 'RunVerdict not available' }, { status: 404 })
        const runs = await runVerdicts.find({})
          .select('createdAt tokenTracker')
          .sort({ createdAt: -1 })
          .limit(30)
          .lean()
        return NextResponse.json(runs)
      }

      // Intelligence Tier 1 new types
      case 'filings': {
        const RegulatoryFiling = (await import('@headlines/models/next')).RegulatoryFiling
        if (!RegulatoryFiling) return NextResponse.json({ error: 'RegulatoryFiling not available' }, { status: 404 })
        const limit = parseInt(searchParams.get('limit') || '50')
        const filings = await RegulatoryFiling.find({})
          .sort({ filingDate: -1 })
          .limit(limit)
          .lean()
        return NextResponse.json(filings)
      }

      case 'ownership': {
        const OwnershipStake = (await import('@headlines/models/next')).OwnershipStake
        if (!OwnershipStake) return NextResponse.json({ error: 'OwnershipStake not available' }, { status: 404 })
        const stakes = await OwnershipStake.find({})
          .sort({ estimatedValueUSD_MM: -1 })
          .limit(100)
          .lean()
        return NextResponse.json(stakes)
      }

      case 'advisors': {
        const DealAdvisor = (await import('@headlines/models/next')).DealAdvisor
        if (!DealAdvisor) return NextResponse.json({ error: 'DealAdvisor not available' }, { status: 404 })
        const advisors = await DealAdvisor.find({})
          .sort({ dealCount: -1 })
          .limit(100)
          .lean()
        return NextResponse.json(advisors)
      }

      case 'family-offices': {
        const FamilyOffice = (await import('@headlines/models/next')).FamilyOffice
        if (!FamilyOffice) return NextResponse.json({ error: 'FamilyOffice not available' }, { status: 404 })
        const sort = searchParams.get('sort') || '-estimatedAUM_USD_MM'
        const fos = await FamilyOffice.find({})
          .sort(sort.startsWith('-') ? { [sort.slice(1)]: -1 } : { [sort]: 1 })
          .limit(100)
          .lean()
        return NextResponse.json(fos)
      }

      case 'sentiment': {
        const Opportunity = (await import('@headlines/models/next')).Opportunity
        if (!Opportunity) return NextResponse.json({ error: 'Opportunity not available' }, { status: 404 })
        const opportunities = await Opportunity.find({ confidenceScore: { $gt: 0 } })
          .select('reachOutTo confidenceScore priority coolingSince sentimentTrend lastSignalDate corroborationCount')
          .sort({ confidenceScore: -1 })
          .limit(100)
          .lean()
        return NextResponse.json(opportunities)
      }

      default:
        return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
    }
  } catch (error) {
    console.error('[Intelligence API Error]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    await dbConnect()
    const body = await request.json()
    const { action, targetId, targetType, value } = body

    if (action === 'update_deal_status' && targetId && value) {
      await SynthesizedEvent.findByIdAndUpdate(targetId, { dealStatus: value })
      return NextResponse.json({ success: true })
    }

    if (action === 'toggle_source' && targetId) {
      const source = await Source.findById(targetId)
      if (!source) return NextResponse.json({ error: 'Source not found' }, { status: 404 })
      const newStatus = source.status === 'paused' ? 'active' : 'paused'
      await Source.findByIdAndUpdate(targetId, { status: newStatus })
      return NextResponse.json({ success: true, newStatus })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('[Intelligence PATCH Error]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}