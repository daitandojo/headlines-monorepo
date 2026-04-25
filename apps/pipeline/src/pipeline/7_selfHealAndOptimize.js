// apps/pipeline/src/pipeline/7_selfHealAndOptimize.js (version 2.0.0)
import { logger } from '@headlines/utils-shared'

export async function runSelfHealAndOptimize(pipelinePayload) {
  const { selfHealer, pipelineMetrics, healthReport } = pipelinePayload || {}
  
  logger.info('--- STAGE 7: SELF-HEAL & OPTIMIZE ---')
  
  // Log pipeline metrics summary
  if (pipelineMetrics) {
    const metricsSummary = pipelineMetrics.getSummary()
    logger.info({ 
      stages: metricsSummary.stages,
      topSources: metricsSummary.sources.slice(0, 5),
      models: metricsSummary.models 
    }, '[SelfHeal] Pipeline metrics summary')
  }
  
  // Process health report and trigger remediations
  if (healthReport) {
    logger.info({ 
      sourcesWithIssues: healthReport.sourcesWithIssues.length,
      modelsWithIssues: healthReport.modelsWithIssues.length,
      totalRunsTracked: healthReport.totalRunsTracked 
    }, '[SelfHeal] Health report received')
    
    // Process source issues
    healthReport.sourcesWithIssues.forEach(sourceIssue => {
      const remediation = selfHealer.recordSourceFailure(sourceIssue.source)
      if (remediation) {
        logger.warn({ 
          remediation, 
          source: sourceIssue.source,
          consecutiveFailures: sourceIssue.consecutiveFailures 
        }, '[SelfHeal] Source issue remediation triggered')
      }
    })
    
    // Process model issues  
    healthReport.modelsWithIssues.forEach(modelIssue => {
      const [modelName, errorType] = modelIssue.modelKey.split(':')
      const remediation = selfHealer.recordModelError(modelName, errorType)
      if (remediation) {
        logger.warn({ 
          remediation,
          model: modelName,
          errorType,
          errorCount: modelIssue.errorCount 
        }, '[SelfHeal] Model issue remediation triggered')
      }
    })
  }
  
  // Log final health report
  if (selfHealer) {
    const finalHealth = selfHealer.getHealthReport()
    logger.info({ 
      sourcesWithIssues: finalHealth.sourcesWithIssues.length,
      modelsWithIssues: finalHealth.modelsWithIssues.length 
    }, '[SelfHeal] Final health report')
  }
  
  logger.info('--- STAGE 7 COMPLETE ---')
  return { success: true, payload: pipelinePayload }
}
