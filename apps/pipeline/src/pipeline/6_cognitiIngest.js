// apps/pipeline/src/pipeline/6_cognitiIngest.js
// STAGE 6: Cogniti Knowledge Base Ingestion
//
// After events and opportunities are saved to MongoDB, this stage
// ingests the refined products into Cogniti's knowledge base via
// its /v1/memories API. Articles are NOT ingested — they are feedstock,
// not refined products.
//
// Non-fatal: if Cogniti is down or misconfigured, the pipeline continues.
// Documents that fail ingestion retain ingested=false for retry.

import { logger } from '@headlines/utils-shared'
import { env, settings } from '@headlines/config'
import { SynthesizedEvent, Opportunity } from '@headlines/models'

const COGNITI_USER_EMAIL = 'admin@wealthintel.com'
const COGNITI_AGENT_ID = 'headlines-pipeline'

function buildEventContent(event) {
  const headline = event.synthesized_headline || 'Untitled Event'
  const summary = event.synthesized_summary || ''
  const triggerClass = event.triggerClass || 'Unclassified'
  const status = event.eventStatus || 'Completed'
  const dealStatus = event.dealStatus || ''
  const countries = (event.country || []).join(', ')
  const score = event.highest_relevance_score ?? '?'

  // Key individuals
  const individuals = (event.key_individuals || [])
    .map(k => `  - ${k.name}${k.role_in_event ? ` (${k.role_in_event})` : ''}${k.company ? ` @ ${k.company}` : ''}`)
    .join('\n')

  // Transaction details
  let txDetails = ''
  if (event.transactionDetails) {
    const tx = event.transactionDetails
    txDetails += `\n\n**Transaction Details**\n`
    if (tx.transactionType) txDetails += `- Type: ${tx.transactionType}\n`
    if (tx.valuationAtEventUSD) txDetails += `- Valuation: $${(tx.valuationAtEventUSD / 1e6).toFixed(0)}M\n`
    if (tx.liquidityFlow?.approxAmountUSD) txDetails += `- Liquidity: $${(tx.liquidityFlow.approxAmountUSD / 1e6).toFixed(0)}M\n`
    if (tx.sellerUBOs?.length) {
      txDetails += `- Sellers:\n`
      tx.sellerUBOs.forEach(s => {
        txDetails += `    ${s.name}${s.estimatedProceedsMM ? ` ($${s.estimatedProceedsMM}M)` : ''}\n`
      })
    }
  }

  // Source articles
  const articles = (event.source_articles || [])
    .slice(0, 3)
    .map(a => `  - [${a.headline || ''}](${a.link || ''}) — ${a.newspaper || ''}`)
    .join('\n')

  return `# ${headline}

**Trigger Class:** ${triggerClass}
**Status:** ${status}${dealStatus ? ` | Deal: ${dealStatus}` : ''}
**Countries:** ${countries}
**Relevance Score:** ${score}/100

${summary}${txDetails}

**Key Individuals:**
${individuals || '  (none)'}

**Source Articles:**
${articles || '  (none)'}`
}

function buildOpportunityContent(opp) {
  const name = opp.reachOutTo || 'Unknown Prospect'
  const type = opp.type || 'beneficiary'
  const triggerClass = opp.triggerClass || ''
  const basedIn = (opp.basedIn || []).join(', ')
  const wealth = opp.likelyMMDollarWealth ?? opp.lastKnownEventLiquidityMM ?? ''
  const priority = opp.priority || 'medium'
  const whyContact = (opp.whyContact || []).join('\n  - ')
  const contact = opp.contactDetails || {}

  let profile = ''
  if (opp.profile) {
    const p = opp.profile
    if (p.biography) profile += `\n\n**Biography:** ${p.biography}`
    if (p.wealthOrigin) profile += `\n**Wealth Origin:** ${p.wealthOrigin}`
    if (p.estimatedNetWorthMM) profile += `\n**Estimated Net Worth:** $${p.estimatedNetWorthMM}M`
    if (p.familyOffice?.name) profile += `\n**Family Office:** ${p.familyOffice.name}`
    if (p.incumbentBank) profile += `\n**Incumbent Bank:** ${p.incumbentBank}`
    if (p.primaryResidence) profile += `\n**Primary Residence:** ${p.primaryResidence}`
    if (p.investmentInterests?.length) profile += `\n**Investment Interests:** ${p.investmentInterests.join(', ')}`
    if (p.philanthropicInterests?.length) profile += `\n**Philanthropy:** ${p.philanthropicInterests.join(', ')}`
    if (p.heirsApparent?.length) profile += `\n**Heirs Apparent:** ${p.heirsApparent.join(', ')}`
    if (p.opennessSignals?.length) profile += `\n**Openness Signals:** ${p.opennessSignals.join(', ')}`
    if (p.painPoints?.length) profile += `\n**Pain Points:** ${p.painPoints.join(', ')}`
  }

  return `# Prospect: ${name}

**Type:** ${type}${triggerClass ? ` | **Trigger:** ${triggerClass}` : ''}
**Priority:** ${priority}
**Based In:** ${basedIn || 'Unknown'}
**Wealth:** ${wealth ? `$${wealth}M` : 'Unknown'}
**Contact:** ${contact.email || 'No email'}${contact.role ? ` (${contact.role})` : ''}${contact.company ? ` @ ${contact.company}` : ''}

**Why Contact:**
  - ${whyContact || 'Potential wealth management opportunity'}${profile}`
}

async function ingestToCogniti(item, content, itemType, tags, metadata) {
  const url = `${env.COGNITI_BASE_URL}/v1/memories`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.COGNITI_API_KEY,
    },
    body: JSON.stringify({
      userEmail: COGNITI_USER_EMAIL,
      agentId: COGNITI_AGENT_ID,
      content,
      domainId: 'wealth',
      tags,
      skipSplitting: true,
      metadata: {
        source: 'headlines-pipeline',
        type: itemType,
        itemId: item._id?.toString(),
        ...metadata,
      },
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Cogniti ${url} returned ${response.status}: ${body.substring(0, 200)}`)
  }

  return response.json()
}

export async function runCognitiIngest(pipelinePayload) {
  logger.info('--- STAGE 6: COGNITI KNOWLEDGE INGESTION ---')

  if (!settings.COGNITI_ENABLED) {
    logger.info('[Cogniti] COGNITI_ENABLED is false. Skipping.')
    return { success: true, payload: pipelinePayload }
  }

  if (!env.COGNITI_API_KEY) {
    logger.warn('[Cogniti] COGNITI_API_KEY not set. Skipping Cogniti ingestion.')
    return { success: true, payload: pipelinePayload }
  }

  const { savedEvents, savedOpportunities } = pipelinePayload
  let ingestedCount = 0
  let failedCount = 0

  // --- Ingest events ---
  if (!savedEvents || savedEvents.length === 0) {
    logger.info('[Cogniti] No new events to ingest.')
  } else {
    logger.info(`[Cogniti] Ingesting ${savedEvents.length} new events...`)

    for (const event of savedEvents) {
      try {
        const content = buildEventContent(event)
        const tags = [
          'wealth',
          'event',
          event.triggerClass || 'unclassified',
          event.eventStatus || 'completed',
          ...(event.country || []).map(c => `country:${c.toLowerCase()}`),
          'source:headlines-pipeline',
        ].filter(Boolean)

        const metadata = {
          triggerClass: event.triggerClass,
          eventStatus: event.eventStatus,
          relevanceScore: event.highest_relevance_score,
          country: event.country,
          createdAt: event.createdAt?.toISOString?.() || event.createdAt,
        }

        const result = await ingestToCogniti(event, content, 'synthesized_event', tags, metadata)

        // Mark ingested in MongoDB
        await SynthesizedEvent.updateOne(
          { _id: event._id },
          { $set: { ingested: true } }
        )

        ingestedCount++
        logger.trace(
          { eventId: event._id, headline: event.synthesized_headline?.substring(0, 40) },
          `[Cogniti] Event ingested. ${result.message || ''}`
        )
      } catch (error) {
        failedCount++
        logger.error(
          { err: error, eventId: event._id },
          `[Cogniti] Failed to ingest event: ${error.message?.substring(0, 100)}`
        )
      }
    }
  }

  // --- Ingest opportunities ---
  if (!savedOpportunities || savedOpportunities.length === 0) {
    logger.info('[Cogniti] No new opportunities to ingest.')
  } else {
    logger.info(`[Cogniti] Ingesting ${savedOpportunities.length} new opportunities...`)

    for (const opp of savedOpportunities) {
      try {
        const content = buildOpportunityContent(opp)
        const tags = [
          'wealth',
          'opportunity',
          opp.type || 'beneficiary',
          opp.triggerClass || 'unclassified',
          opp.priority || 'medium',
          ...(opp.basedIn || []).map(c => `location:${c.toLowerCase()}`),
          'source:headlines-pipeline',
        ].filter(Boolean)

        const metadata = {
          triggerClass: opp.triggerClass,
          priority: opp.priority,
          type: opp.type,
          wealthMM: opp.likelyMMDollarWealth,
          basedIn: opp.basedIn,
        }

        const result = await ingestToCogniti(opp, content, 'opportunity', tags, metadata)

        // Mark ingested in MongoDB
        await Opportunity.updateOne(
          { _id: opp._id },
          { $set: { ingested: true } }
        )

        ingestedCount++
        logger.trace(
          { oppId: opp._id, name: opp.reachOutTo?.substring(0, 40) },
          `[Cogniti] Opportunity ingested. ${result.message || ''}`
        )
      } catch (error) {
        failedCount++
        logger.error(
          { err: error, oppId: opp._id },
          `[Cogniti] Failed to ingest opportunity: ${error.message?.substring(0, 100)}`
        )
      }
    }
  }

  logger.info(
    `[Cogniti] Stage complete. Ingested: ${ingestedCount}, Failed: ${failedCount}`
  )

  // Trigger graph linking for newly ingested memories (fire-and-forget)
  // Links new memories to existing graph_entities for multi-hop traversal
  try {
    const linkUrl = `${env.COGNITI_BASE_URL}/cron/link-graph`
    const linkResponse = await fetch(linkUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.COGNITI_API_KEY,
      },
      body: JSON.stringify({ userEmail: COGNITI_USER_EMAIL }),
      signal: AbortSignal.timeout(30000),
    })
    if (linkResponse.ok) {
      const linkResult = await linkResponse.json()
      logger.info(
        `[Cogniti] Graph linking complete. Links created: ${linkResult.linksCreated || 0}, New entities: ${linkResult.newEntitiesCreated || 0}`
      )
    } else {
      logger.warn(`[Cogniti] Graph linking returned ${linkResponse.status}`)
    }
  } catch (linkError) {
    // Non-fatal — graph linking runs nightly anyway
    logger.warn(
      `[Cogniti] Graph linking skipped: ${linkError.message?.substring(0, 100) || 'timeout or unavailable'}`
    )
  }

  return { success: true, payload: pipelinePayload }
}
