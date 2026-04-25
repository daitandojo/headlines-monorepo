// apps/pipeline/src/modules/monitoring/selfHeal.js
import { logger } from '@headlines/utils-shared'

export const REMEDIATION_ACTIONS = {
  PAUSE_SOURCE: 'pause_source',
  SWAP_MODEL: 'swap_model',
  REDUCE_BATCH: 'reduce_batch',
  SKIP_NON_CRITICAL: 'skip_enrichment',
  ALERT: 'alert',
}

export const FAILURE_PATTERNS = {
  CONSECUTIVE_SOURCE_FAILURES: { threshold: 3, action: REMEDIATION_ACTIONS.PAUSE_SOURCE },
  MODEL_JSON_ERRORS: { threshold: 5, action: REMEDIATION_ACTIONS.SWAP_MODEL },
  ENRICHMENT_TIMEOUTS: { threshold: 3, action: REMEDIATION_ACTIONS.SKIP_NON_CRITICAL },
  HIGH_TOKEN_COSTS: { threshold: 50, action: REMEDIATION_ACTIONS.REDUCE_BATCH },
}

class SelfHealer {
  constructor() {
    this.sourceFailureCounts = new Map()
    this.modelErrorCounts = new Map()
    this.runMetrics = []
  }

  recordSourceFailure(source) {
    const count = (this.sourceFailureCounts.get(source) || 0) + 1
    this.sourceFailureCounts.set(source, count)
    logger.info({ source, consecutiveFailures: count }, '[SelfHeal] Source failure recorded')
    
    if (count >= FAILURE_PATTERNS.CONSECUTIVE_SOURCE_FAILURES.threshold) {
      return {
        action: REMEDIATION_ACTIONS.PAUSE_SOURCE,
        source,
        reason: `${count} consecutive failures`,
        severity: 'high',
      }
    }
    return null
  }

  recordSourceSuccess(source) {
    this.sourceFailureCounts.set(source, 0)
  }

  recordModelError(model, errorType) {
    const key = `${model}:${errorType}`
    const count = (this.modelErrorCounts.get(key) || 0) + 1
    this.modelErrorCounts.set(key, count)
    logger.info({ model, errorType, errorCount: count }, '[SelfHeal] Model error recorded')
    
    if (count >= FAILURE_PATTERNS.MODEL_JSON_ERRORS.threshold) {
      return {
        action: REMEDIATION_ACTIONS.SWAP_MODEL,
        model,
        reason: `${count} JSON parse errors`,
        severity: 'medium',
      }
    }
    return null
  }

  recordRunMetrics(metrics) {
    this.runMetrics.push({ ...metrics, timestamp: new Date() })
    if (this.runMetrics.length > 100) this.runMetrics.shift()
  }

  checkTokenThreshold() {
    const recent = this.runMetrics.slice(-5)
    if (recent.length < 3) return null
    
    const avgTokens = recent.reduce((sum, r) => sum + (r.totalTokens || 0), 0) / recent.length
    if (avgTokens >= FAILURE_PATTERNS.HIGH_TOKEN_COSTS.threshold * 1000) {
      return {
        action: REMEDIATION_ACTIONS.REDUCE_BATCH,
        reason: `High token usage: ${avgTokens.toFixed(0)} avg`,
        severity: 'medium',
      }
    }
    return null
  }

  getHealthReport() {
    const sourcesWithIssues = []
    this.sourceFailureCounts.forEach((count, source) => {
      if (count >= 2) sourcesWithIssues.push({ source, consecutiveFailures: count })
    })

    const modelsWithIssues = []
    this.modelErrorCounts.forEach((count, modelKey) => {
      if (count >= 2) modelsWithIssues.push({ modelKey, errorCount: count })
    })

    return {
      sourcesWithIssues,
      modelsWithIssues,
      totalRunsTracked: this.runMetrics.length,
      lastRun: this.runMetrics[this.runMetrics.length - 1] || null,
    }
  }

  reset() {
    this.sourceFailureCounts.clear()
    this.modelErrorCounts.clear()
  }
}

export const selfHealer = new SelfHealer()