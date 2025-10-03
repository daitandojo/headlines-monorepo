// apps/pipeline/src/utils/runStatsManager.js (version 1.0.0)
import { logger } from '@headlines/utils-shared'

/**
 * A dedicated class for managing the pipeline's run statistics.
 * This encapsulates the stats object, preventing direct mutation and ensuring consistency.
 */
export class RunStatsManager {
  constructor() {
    this.stats = {
      headlinesScraped: 0,
      scraperHealth: [],
      validatedHeadlines: 0,
      freshHeadlinesFound: 0,
      headlinesAssessed: 0,
      relevantHeadlines: 0,
      articlesEnriched: 0,
      relevantArticles: 0,
      eventsClustered: 0,
      eventsSynthesized: 0,
      synthesizedEventsForReport: [],
      enrichmentOutcomes: [],
      judgeVerdict: null,
      eventsEmailed: 0,
      errors: [],
      tokenUsage: {},
      apiCalls: {},
    }
    logger.info('[RunStatsManager] Initialized a new statistics object.')
  }

  /**
   * Increments a numerical stat.
   * @param {keyof this.stats} key - The name of the stat to increment.
   * @param {number} [value=1] - The value to add.
   */
  increment(key, value = 1) {
    if (typeof this.stats[key] === 'number') {
      this.stats[key] += value
    } else {
      logger.warn(`[RunStatsManager] Attempted to increment non-numeric stat: '${key}'`)
    }
  }

  /**
   * Pushes a new value into an array-based stat.
   * @param {keyof this.stats} key - The name of the array stat.
   * @param {*} value - The value to push.
   */
  push(key, value) {
    if (Array.isArray(this.stats[key])) {
      this.stats[key].push(value)
    } else {
      logger.warn(`[RunStatsManager] Attempted to push to non-array stat: '${key}'`)
    }
  }

  /**
   * Sets the value of a specific stat.
   * @param {keyof this.stats} key - The name of the stat to set.
   * @param {*} value - The new value.
   */
  set(key, value) {
    if (key in this.stats) {
      this.stats[key] = value
    } else {
      logger.warn(`[RunStatsManager] Attempted to set unknown stat: '${key}'`)
    }
  }

  /**
   * Appends an array of values to an array-based stat.
   * @param {keyof this.stats} key - The name of the array stat.
   * @param {Array<*>} values - The values to append.
   */
  concat(key, values) {
    if (Array.isArray(this.stats[key]) && Array.isArray(values)) {
      this.stats[key] = this.stats[key].concat(values)
    } else {
      logger.warn(
        `[RunStatsManager] Attempted to concat non-array stat or values for key: '${key}'`
      )
    }
  }

  /**
   * Returns the entire statistics object.
   * @returns {object} The current stats object.
   */
  getStats() {
    return this.stats
  }
}
