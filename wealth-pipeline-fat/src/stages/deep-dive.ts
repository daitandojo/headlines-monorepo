// apps/wealth-pipeline/src/stages/deep-dive.ts
// File 1 of 2
// One-line rationale: Correcting the `run` method signature to accept the `newEvents` array from the clustering stage.

import {
  updateArticleStatus,
  upsertOpportunity,
  linkOpportunityToEvent,
} from '@wealth/access'
import { apiClient, opportunitySchema } from '@wealth/domain'
import { updateGraphFromOpportunity } from '../services/graph.js'
import type { HeadlinesScraper } from '../scraper/index.js'
import type { RunStatsManager } from '../utils/run-stats.js'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { getInstructionOpportunities } from '@wealth/domain'

export class DeepDiveStage {
  private scraper: HeadlinesScraper
  private stats: RunStatsManager

  constructor(scraper: HeadlinesScraper, stats: RunStatsManager) {
    this.scraper = scraper
    this.stats = stats
  }

  // CORRECTED: The `run` method now accepts the events from the previous stage.
  async run(newEvents: any[]): Promise<{ opportunities: any[]; events: any[] }> {
    console.log('\n--- STAGE 4: EVENT DEEP DIVE (Powered by Kimi) ---')

    if (!newEvents || newEvents.length === 0) {
      console.log('No new events to deep-dive into.')
      return { opportunities: [], events: [] }
    }

    const allNewOpportunities: any[] = []
    const allNewEvents: any[] = []

    for (const event of newEvents) {
      if ((event as any).opportunities?.length > 0) continue

      console.log(`\n🌊 Analyzing Event: "${event.synthesized_headline}"`)

      const context = await this.gatherContext(event)
      if (!context) continue

      const opps = await this.extractWithKimi(event, context)

      if (opps.length > 0) {
        for (const oppData of opps) {
          const savedOpp = await this.handleSaveOpportunity(oppData, event._id)
          if (savedOpp) {
            allNewOpportunities.push(savedOpp)
            this.stats.increment('opportunitiesSaved')
          }
        }

        const enrichedEvent = { ...event, relatedOpportunities: opps }
        allNewEvents.push(enrichedEvent)
      }
    }
    return { opportunities: allNewOpportunities, events: allNewEvents }
  }

  private async gatherContext(event: any): Promise<string> {
    const articles = event.articles || []
    let combinedContent = ''

    for (const article of articles) {
      try {
        const scrapeResult = await this.scraper.scrapeArticle(article.link)
        await updateArticleStatus(article._id, 'enriched', {
          articleContent: { contents: [scrapeResult.content], method: 'Readability' },
        })
        combinedContent += `\n=== SOURCE: ${article.newspaper} ===\n${scrapeResult.content}\n`
        this.stats.increment('articlesEnriched')
      } catch (e) {
        combinedContent += `\n=== SOURCE (Metadata Only): ${article.newspaper} ===\n${article.headline}\n`
      }
    }
    return combinedContent
  }

  private async extractWithKimi(event: any, context: string): Promise<any[]> {
    const instructions = getInstructionOpportunities()

    const prompt = `
      ${instructions.systemRole}
      ${instructions.task}
      ${instructions.opportunityCriteria.join('\n')}
      ${instructions.exclusionRules.join('\n')}
      ${instructions.dataSourceHierarchy.join('\n')}
      
      **EVENT CONTEXT:**
      Headline: ${event.synthesized_headline}
      Event Key: ${event.event_key}
      
      **FULL SOURCE CONTENT:**
      ${context}
      `

    const toolDef = {
      name: 'extract_opportunities',
      description: 'Extract high-value wealth opportunities.',
      parameters: zodToJsonSchema(opportunitySchema),
    }

    const opportunities: any[] = []
    try {
      const options: any = {
        userId: 'headlines-deep-dive',
        prompt,
        remoteTools: [toolDef],
        executionMode: 'deep',
      }
      const stream = apiClient.think(options)

      for await (const e of stream) {
        if (e.type === 'tool_call' && e.toolCall?.name === 'extract_opportunities') {
          if (e.toolCall.arguments.opportunities) {
            opportunities.push(...e.toolCall.arguments.opportunities)
          }
        }
      }
    } catch (e: any) {
      console.error(`[DeepDive] Kimi extraction failed:`, e.message)
      this.stats.addError(`Kimi extraction failed: ${e.message}`)
    }
    return opportunities
  }

  private async handleSaveOpportunity(args: any, eventId: any) {
    try {
      const opportunity = await upsertOpportunity(args.reachOutTo, args, eventId)
      if (opportunity) {
        await linkOpportunityToEvent(eventId, opportunity._id.toString())
        await updateGraphFromOpportunity(opportunity as any)
        console.log(
          `  💰 Opportunity: ${opportunity.reachOutTo} ($${opportunity.lastKnownEventLiquidityMM}M)`
        )
        return opportunity
      }
      return null
    } catch (e: any) {
      console.error('Failed to save opportunity:', e.message)
      return null
    }
  }
}
