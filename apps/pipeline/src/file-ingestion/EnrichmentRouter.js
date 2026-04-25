// apps/pipeline/src/file-ingestion/EnrichmentRouter.js
// Orchestrates per-individual enrichment
import { logger } from '@headlines/utils-shared'
import { enrichOpportunityWithPriority } from '@headlines/ai-services'
import { Opportunity } from '@headlines/models'

export class EnrichmentRouter {
  static async processAll(individuals, sourceFile, runId, runLogger) {
    const succeeded = []
    const failed = []
    const excluded = []

    console.log(`  Processing ${individuals.length} individuals...`)

    for (let i = 0; i < individuals.length; i++) {
      const individual = individuals[i]
      const total = individuals.length
      const index = i + 1
      const name = individual.name

      console.log(`  [${index}/${total}] ${name}...`)

      // Step wrapper with logging
      const step = async (label, fn) => {
        logger.info(`[ENRICH][${index}/${total}] ${name} — ${label}: starting`)
        try {
          const result = await fn()
          logger.info(`[ENRICH][${index}/${total}] ${name} — ${label}: completed`)
          return result
        } catch (err) {
          logger.error(`[ENRICH][${index}/${total}] ${name} — ${label}: FAILED — ${err.message}`)
          throw err
        }
      }

      try {
        // Build synthetic opportunity
        const opp = await step('Step A: build opportunity', () => this.buildOpportunity(individual, sourceFile, runId))
        
        // Build minimal event
        const event = await step('Step B: build event', () => this.buildEvent(individual, opp))

        // Run enrichment
        const enriched = await step('Step C: enrich', () => enrichOpportunityWithPriority(opp, event))

        // UHNW Gate Check
        // For file ingestion, we use the wealth estimate from the source file
        // If wealthAmountMM >= 30M EUR, assume UHNW
        // If no wealth data or < 30M, exclude (not a valid opportunity)
        const wealthMM = individual.wealthAmountMM || enriched.profile?.estimatedNetWorthMM || 0
        const hasWealthData = individual.wealthEstimate || wealthMM > 0
        
        // Set UHNW flags based on file data
        if (!hasWealthData) {
          logger.info(`[ENRICH][${index}/${total}] ${name} — UHNW gate: NO WEALTH DATA — EXCLUDED`)
          runLogger.logExclusion(name, 'no_wealth_data')
          excluded.push({ name, reason: 'no_wealth_data' })
          continue
        }
        
        if (wealthMM < 30) {
          logger.info(`[ENRICH][${index}/${total}] ${name} — UHNW gate: BELOW THRESHOLD (<€30M) — EXCLUDED`)
          runLogger.logExclusion(name, 'below_threshold')
          excluded.push({ name, reason: 'below_threshold' })
          continue
        }
        
        // Wealth >= 30M - treat as UHNW based on source data
        logger.info(`[ENRICH][${index}/${total}] ${name} — UHNW gate: CONFIRMED (€${wealthMM}M) — proceeding`)

        // Sanitize all potentially-object fields to strings/null
        const sanitized = await step('Step D: sanitize', () => this.sanitizeEnriched(enriched))

        // Save to database
        const saved = await step('Step E: save to DB', () => 
          Opportunity.updateOne(
            { reachOutTo: enriched.reachOutTo },
            { $set: { ...sanitized, sourceFile, ingestionRunId: runId } },
            { upsert: true }
          )
        )

        succeeded.push({
          name,
          status: 'success',
          opportunityId: saved.upsertedId || 'existing',
          priority: enriched.priority,
          priorityScore: enriched.priorityScore,
          wealthEstimateMM: individual.wealthAmountMM,
        })
        console.log(`    Created: ${saved.upsertedId || 'existing'} (priority: ${enriched.priority})`)

      } catch (error) {
        failed.push({ name: individual.name, error: error.message })
        console.log(`    Failed: ${error.message}`)
      }
    }

    return { succeeded, failed, excluded }
  }

  static buildOpportunity(individual, sourceFile, runId) {
    return {
      reachOutTo: individual.name,
      type: 'beneficiary',
      triggerClass: this.deriveTriggerClass(individual),
      triggerSummary: `Identified from file ingestion: ${sourceFile}`,
      lastKnownEventLiquidityMM: individual.wealthAmountMM || null,
      profile: {
        estimatedNetWorthMM: individual.wealthAmountMM || 0,
        wealthOrigin: individual.sector || null,
      },
      basedIn: individual.country ? [individual.country] : [],
      contactDetails: {
        company: individual.company || null,
        role: individual.role || null,
      },
      whyContact: [`Identified from file source: ${sourceFile}`],
      sourceFile,
      ingestionRunId: runId,
    }
  }

  static buildEvent(individual, opp) {
    return {
      triggerClass: opp.triggerClass,
      eventStatus: 'Completed',
      eventClassification: 'Wealth Mentioned',
      dealCloseDate: null,
      transactionDetails: {
        liquidityFlow: individual.wealthAmountMM ? {
          nature: 'Listed wealth estimate',
          approxAmountUSD: individual.wealthAmountMM,
        } : null,
      },
      successionSignals: { score: 0 },
    }
  }

  static sanitizeEnriched(enriched) {
    const sanitized = { ...enriched }
    
    if (sanitized.followUpDate && typeof sanitized.followUpDate === 'object') {
      sanitized.followUpDate = sanitized.followUpDate.date || null
    }
    if (sanitized.followUpReason && typeof sanitized.followUpReason === 'object') {
      sanitized.followUpReason = sanitized.followUpReason.reason || null
    }
    if (sanitized.liquidityEvent?.estimatedDate && typeof sanitized.liquidityEvent.estimatedDate === 'object') {
      sanitized.liquidityEvent.estimatedDate = sanitized.liquidityEvent.estimatedDate.date || null
    }

    return sanitized
  }

  static deriveTriggerClass(individual) {
    if (individual.wealthAmountMM && individual.wealthAmountMM >= 100) {
      return 'TC5_LISTED_COMPANY'
    }
    return 'TC_RICH_LIST'
  }
}