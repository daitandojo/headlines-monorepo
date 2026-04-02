// apps/wealth-pipeline/src/stages/triage.ts
// File 2 of 4
// One-line rationale: Correcting the `run` method to return the triaged articles for the next stage.

import { getArticles, updateArticleStatus } from '@wealth/access'
import { HeadlineAgent } from '@wealth/domain'
import type { RunStatsManager } from '../utils/run-stats.js'
import { getActiveWatchlist } from '@wealth/access'

export class TriageStage {
  constructor(private stats: RunStatsManager) {}

  async run(): Promise<any[]> {
    // CORRECTED: Returns an array of articles
    console.log('\n--- STAGE 2: TRIAGE (High Fidelity) ---')
    const candidates = await getArticles({ status: 'scraped' }, 200)

    if (candidates.length === 0) {
      console.log('No new articles to triage.')
      return []
    }

    await this.processBatch(candidates as any[])
    this.stats.incrementBy('headlinesAssessed', candidates.length)

    // Return only the relevant articles for the next stage
    return candidates.filter((a) => (a.relevance_headline || 0) > 50)
  }

  private async processBatch(articles: any[]) {
    const watchlist = await getActiveWatchlist()
    const watchlistNames = watchlist.map((w) => w.name).join(', ')

    try {
      const assessments = await HeadlineAgent.assessBatch(articles, watchlistNames)
      let relevantCount = 0

      for (const assessment of assessments) {
        if (assessment.id) {
          await updateArticleStatus(assessment.id, 'assessed', {
            relevance_headline: assessment.relevance_headline,
            assessment_headline: assessment.assessment_headline,
          })

          // Update in-memory object for immediate use in the return value
          const article = articles.find((a) => a._id.toString() === assessment.id)
          if (article) {
            article.relevance_headline = assessment.relevance_headline
          }

          if (assessment.relevance_headline > 50) {
            relevantCount++
          }
        }
      }
      this.stats.incrementBy('relevantHeadlines', relevantCount)
      console.log(
        `✅ Triage processed ${assessments.length} headlines, found ${relevantCount} relevant.`
      )
    } catch (e: any) {
      console.error('Triage failed:', e.message)
      this.stats.addError(`Triage failure: ${e.message}`)
    }
  }
}
