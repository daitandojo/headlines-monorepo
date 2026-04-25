  getMetricsFromDB() {
    // Query MongoDB for current pipeline health
    return {
      sources: Array.from(this.sourceMetrics.entries()).map(([source, stats]) => ({
        source,
        runs: stats.runs,
        totalHeadlines: stats.totalHeadlines,
        avgDuration: stats.avgDuration,
        healthStatus: stats.totalHeadlines === 0 ? 'empty' : stats.totalHeadlines < 5 ? 'low' : 'healthy',
        fallbackConfigured: settings.LLM_MODEL_FALLBACK ? true : false,
      })),
      models: Array.from(this.modelMetrics.entries()).map(([modelKey, stats]) => ({
        model: modelKey,
        calls: stats.calls,
        totalTokens: stats.totalTokens,
        totalCost: `$${stats.totalCost.toFixed(4)}`,
        failureRate: stats.calls > 0 ? `${(stats.failures / stats.calls * 100).toFixed(1)}%` : '0%',
      })),
    }
  }

  getFallbackConfig() {
    return {
      model: settings.LLM_MODEL_FALLBACK,
      whitelist: MODEL_WHITELIST,
      autoFallback: true,
    }
  }