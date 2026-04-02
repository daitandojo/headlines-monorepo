// apps/wealth-pipeline/src/utils/run-stats.ts
// File 1 of 4
// One-line rationale: Adding `incrementBy` method and fixing key types for robust metric tracking.

import { sendErrorAlert } from '@shared/server'

// Define the precise keys for type safety
export type StatKey =
  | 'headlinesScraped'
  | 'headlinesAssessed'
  | 'relevantHeadlines'
  | 'articlesEnriched'
  | 'eventsSynthesized'
  | 'opportunitiesSaved'
  | 'eventsEmailed'

export class RunStatsManager {
  public stats: Record<StatKey | 'errors', any> = {
    headlinesScraped: 0,
    headlinesAssessed: 0,
    relevantHeadlines: 0,
    articlesEnriched: 0,
    eventsSynthesized: 0,
    opportunitiesSaved: 0,
    eventsEmailed: 0,
    errors: [] as string[],
  }

  increment(key: StatKey) {
    if (typeof this.stats[key] === 'number') {
      ;(this.stats[key] as number)++
    }
  }

  incrementBy(key: StatKey, amount: number) {
    if (typeof this.stats[key] === 'number') {
      ;(this.stats[key] as number) += amount
    }
  }

  addError(msg: string) {
    this.stats.errors.push(msg)
    sendErrorAlert(new Error(msg), { origin: 'RunStatsManager' })
  }

  getSummary() {
    return `
    --- RUN SUMMARY ---
    Headlines Scraped:    ${this.stats.headlinesScraped}
    Headlines Assessed:   ${this.stats.headlinesAssessed}
    Relevant Signals:     ${this.stats.relevantHeadlines}
    Articles Enriched:    ${this.stats.articlesEnriched}
    Events Created:       ${this.stats.eventsSynthesized}
    Opportunities Found:  ${this.stats.opportunitiesSaved}
    Notifications Sent:   ${this.stats.eventsEmailed}
    Errors:               ${this.stats.errors.length}
    -------------------
    `
  }
}
