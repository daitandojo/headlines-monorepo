// apps/pipeline/src/modules/monitoring/selfHealV2.js
import { logger } from '@headlines/utils-shared'
import { Source, HealingLog } from '@headlines/models'
import { settings } from '@headlines/config'

const REMEDIATION_ACTIONS = {
  PAUSE_SOURCE: 'pause_source',
  REACTIVATE_SOURCE: 'reactivate_source',
  SWAP_MODEL: 'swap_model',
  REDUCE_CONCURRENCY: 'reduce_concurrency',
  ALERT: 'alert',
}

const FAILURE_PATTERNS = {
  CONSECUTIVE_SOURCE_FAILURES: { threshold: 5, action: REMEDIATION_ACTIONS.PAUSE_SOURCE },
  MODEL_RATE_LIMITS: { threshold: 3, action: REMEDIATION_ACTIONS.SWAP_MODEL },
  ENRICHMENT_TIMEOUTS: { threshold: 3, action: REMEDIATION_ACTIONS.ALERT },
  HIGH_API_COST: { threshold: 5, action: REMEDIATION_ACTIONS.REDUCE_CONCURRENCY },
  SOURCE_REACTIVATE_AFTER_MS: 24 * 60 * 60 * 1000,
}

class SelfHealerV2 {
  constructor() {
    this.sourceFailureCounts = new Map()
    this.modelErrorCounts = new Map()
    this.runMetrics = []
    this.healingLogs = []
  }

  async recordSourceFailure(sourceName, runId) {
    const count = (this.sourceFailureCounts.get(sourceName) || 0) + 1
    this.sourceFailureCounts.set(sourceName, count)
    logger.info(`[SelfHealV2] ${sourceName}: consecutive failure ${count}`)

    if (count >= FAILURE_PATTERNS.CONSECUTIVE_SOURCE_FAILURES.threshold) {
      return this._executeRemediation({
        action: REMEDIATION_ACTIONS.PAUSE_SOURCE,
        targetType: 'source',
        targetName: sourceName,
        reason: `${count} consecutive failures (threshold: ${FAILURE_PATTERNS.CONSECUTIVE_SOURCE_FAILURES.threshold})`,
        severity: 'high',
        runId,
        before: { consecutiveFailures: count },
        after: { status: 'paused' },
      }, async () => {
        await Source.updateOne(
          { name: sourceName },
          { $set: { status: 'paused', lastScrapedAt: new Date() } }
        )
        logger.warn(`[SelfHealV2] Auto-paused source: ${sourceName}`)
      })
    }
    return null
  }

  recordSourceSuccess(sourceName) {
    const wasFailing = (this.sourceFailureCounts.get(sourceName) || 0) >= 2
    this.sourceFailureCounts.set(sourceName, 0)
    if (wasFailing) {
      logger.info(`[SelfHealV2] ${sourceName}: recovered (failures reset)`)
    }
  }

  async recordModelError(model, errorType, runId) {
    const key = `${model}:${errorType}`
    const count = (this.modelErrorCounts.get(key) || 0) + 1
    this.modelErrorCounts.set(key, count)
    logger.info(`[SelfHealV2] Model ${model}: ${errorType} (${count})`)

    if (count >= FAILURE_PATTERNS.MODEL_RATE_LIMITS.threshold && (errorType.includes('429') || errorType.includes('rate'))) {
      const fallback = settings.LLM_MODEL_FALLBACK || 'deepseek/deepseek-v4-flash'
      return this._executeRemediation({
        action: REMEDIATION_ACTIONS.SWAP_MODEL,
        targetType: 'model',
        targetName: model,
        reason: `${count} rate-limit errors, switching to ${fallback}`,
        severity: 'medium',
        runId,
        before: { model, errorCount: count },
        after: { model: fallback, reason: 'auto-swapped due to rate limits' },
      }, async () => {
        try {
          const settingDoc = await import('@headlines/utils-server').then(m => m.findSettingByKey)
          if (typeof settingDoc === 'function') {
            await settingDoc('LLM_MODEL_FALLBACK', fallback)
          }
        } catch { /* best-effort */ }
        logger.warn(`[SelfHealV2] Auto-swapped ${model} → ${fallback}`)
      })
    }
    return null
  }

  recordRunMetrics(metrics) {
    this.runMetrics.push({ ...metrics, timestamp: new Date() })
    if (this.runMetrics.length > 100) this.runMetrics.shift()
  }

  async checkAndHealSources(runId) {
    try {
      const allowedCountries = ['Denmark', 'Netherlands']
      const pausedSources = await Source.find({ status: 'paused' }).lean()
      if (pausedSources.length === 0) return

      for (const source of pausedSources) {
        if (!allowedCountries.includes(source.country)) continue

        const pausedSince = source.lastScrapedAt || source.updatedAt
        const elapsed = pausedSince ? Date.now() - new Date(pausedSince).getTime() : 0

        if (elapsed >= FAILURE_PATTERNS.SOURCE_REACTIVATE_AFTER_MS) {
          await this._executeRemediation({
            action: REMEDIATION_ACTIONS.REACTIVATE_SOURCE,
            targetType: 'source',
            targetName: source.name,
            reason: `Paused for ${(elapsed / 3600000).toFixed(0)}h — reactivating`,
            severity: 'low',
            runId,
            before: { status: 'paused', pausedFor: `${(elapsed / 3600000).toFixed(0)}h` },
            after: { status: 'active' },
          }, async () => {
            await Source.updateOne(
              { _id: source._id },
              { $set: { status: 'active' } }
            )
            this.sourceFailureCounts.set(source.name, 0)
            logger.info(`[SelfHealV2] Reactivated source: ${source.name}`)
          })
        }
      }
    } catch (error) {
      logger.warn(`[SelfHealV2] Source reactivation check failed: ${error.message?.substring(0, 60)}`)
    }
  }

  checkApiCosts(runId) {
    const recent = this.runMetrics.slice(-5)
    if (recent.length < 3) return null

    const avgCost = recent.reduce((sum, r) => sum + (r.totalApiCost || 0), 0) / recent.length
    if (avgCost >= FAILURE_PATTERNS.HIGH_API_COST.threshold) {
      logger.warn(`[SelfHealV2] High API cost: $${avgCost.toFixed(2)} avg — alert triggered`)
      return {
        action: REMEDIATION_ACTIONS.ALERT,
        reason: `High API cost: $${avgCost.toFixed(2)} avg over last ${recent.length} runs`,
        severity: 'medium',
        runId,
      }
    }
    return null
  }

  async _executeRemediation(entry, actionFn) {
    this.healingLogs.push(entry)
    try {
      await actionFn()
      if (entry.success !== false) {
        try { await HealingLog.create(entry) } catch {}
      }
    } catch (error) {
      entry.success = false
      entry.error = error.message?.substring(0, 100)
      logger.warn(`[SelfHealV2] Remediation failed for ${entry.targetName}: ${entry.error}`)
      try { await HealingLog.create(entry) } catch {}
    }
    return entry
  }

  async flushLogs() {
    if (this.healingLogs.length === 0) return
    try {
      await HealingLog.insertMany(this.healingLogs)
      this.healingLogs = []
    } catch (error) {
      logger.warn(`[SelfHealV2] Failed to flush healing logs: ${error.message?.substring(0, 60)}`)
    }
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
      healingActionsTaken: this.healingLogs.length,
      lastRun: this.runMetrics[this.runMetrics.length - 1] || null,
    }
  }

  reset() {
    this.sourceFailureCounts.clear()
    this.modelErrorCounts.clear()
    this.healingLogs = []
  }
}

export const selfHealerV2 = new SelfHealerV2()
export { REMEDIATION_ACTIONS, FAILURE_PATTERNS }