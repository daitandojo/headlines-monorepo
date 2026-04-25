// apps/pipeline/src/modules/monitoring/pipelineMetrics.js
import { logger } from '@headlines/utils-shared'

export class PipelineMetrics {
  constructor() {
    this.stageMetrics = new Map()
    this.sourceMetrics = new Map()
    this.modelMetrics = new Map()
    this.startTime = null
  }

  startRun() {
    this.startTime = new Date()
    this.currentStage = null
    logger.info('[Metrics] Pipeline run started')
  }

  startStage(stageName) {
    this.currentStage = stageName
    if (!this.stageMetrics.has(stageName)) {
      this.stageMetrics.set(stageName, { attempts: 0, successes: 0, failures: 0, totalDuration: 0 })
    }
    const stats = this.stageMetrics.get(stageName)
    stats.attempts++
    stats._stageStart = Date.now()
    logger.info({ stage: stageName, attempt: stats.attempts }, '[Metrics] Stage started')
  }

  endStage(stageName, success = true) {
    const stats = this.stageMetrics.get(stageName)
    if (!stats) return

    const duration = stats._stageStart ? Date.now() - stats._stageStart : 0
    stats.totalDuration += duration
    if (success) {
      stats.successes++
    } else {
      stats.failures++
    }
    delete stats._stageStart

    logger.info({ stage: stageName, success, duration: `${duration}ms` }, '[Metrics] Stage ended')
  }

  recordSourceResult(source, headlinesFound, duration) {
    if (!this.sourceMetrics.has(source)) {
      this.sourceMetrics.set(source, { runs: 0, totalHeadlines: 0, avgDuration: 0 })
    }
    const stats = this.sourceMetrics.get(source)
    stats.runs++
    stats.totalHeadlines += headlinesFound
    stats.avgDuration = ((stats.avgDuration * (stats.runs - 1)) + duration) / stats.runs

    logger.info({ source, headlinesFound, duration: `${duration}ms` }, '[Metrics] Source result')
  }

  recordModelUsage(modelName, tokensUsed, costUSD, success) {
    if (!this.modelMetrics.has(modelName)) {
      this.modelMetrics.set(modelName, { calls: 0, totalTokens: 0, totalCost: 0, failures: 0 })
    }
    const stats = this.modelMetrics.get(modelName)
    stats.calls++
    stats.totalTokens += tokensUsed
    stats.totalCost += costUSD
    if (!success) stats.failures++

    logger.info({ model: modelName, tokens: tokensUsed, cost: `$${costUSD}` }, '[Metrics] Model usage')
  }

  endRun() {
    const duration = this.startTime ? Date.now() - this.startTime : 0
    logger.info({ totalDuration: `${duration}ms` }, '[Metrics] Pipeline run ended')
    this.startTime = null
    return this.getSummary()
  }

  getSummary() {
    const stageSummary = []
    this.stageMetrics.forEach((stats, stage) => {
      const successRate = stats.attempts > 0 ? (stats.successes / stats.attempts * 100).toFixed(1) : 0
      stageSummary.push({
        stage,
        attempts: stats.attempts,
        successRate: `${successRate}%`,
        avgDuration: stats.attempts > 0 ? `${(stats.totalDuration / stats.attempts).toFixed(0)}ms` : '0ms',
      })
    })

    const sourceSummary = []
    this.sourceMetrics.forEach((stats, source) => {
      sourceSummary.push({
        source,
        runs: stats.runs,
        totalHeadlines: stats.totalHeadlines,
        avgDuration: `${stats.avgDuration.toFixed(0)}ms`,
      })
    })

    const modelSummary = []
    this.modelMetrics.forEach((stats, model) => {
      modelSummary.push({
        model,
        calls: stats.calls,
        totalTokens: stats.totalTokens,
        totalCost: `$${stats.totalCost.toFixed(4)}`,
        failureRate: stats.calls > 0 ? `${(stats.failures / stats.calls * 100).toFixed(1)}%` : '0%',
      })
    })

    return {
      stages: stageSummary,
      sources: sourceSummary.sort((a, b) => b.totalHeadlines - a.totalHeadlines).slice(0, 10),
      models: modelSummary,
    }
  }

  getSourceHealth() {
    const sources = []
    this.sourceMetrics.forEach((stats, source) => {
      const successRate = stats.runs > 0 ? ((stats.totalHeadlines > 0 ? 1 : 0) * 100) : 0
      sources.push({
        source,
        lastRun: stats.runs,
        totalHeadlines: stats.totalHeadlines,
        avgDuration: stats.avgDuration,
        healthStatus: stats.totalHeadlines === 0 ? 'empty' : stats.totalHeadlines < 5 ? 'low' : 'healthy',
      })
    })
    return sources
  }

  clear() {
    this.stageMetrics.clear()
    this.sourceMetrics.clear()
    this.modelMetrics.clear()
    this.startTime = null
  }
}

export const pipelineMetrics = new PipelineMetrics()