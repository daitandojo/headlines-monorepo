// apps/pipeline/src/pipeline/submodules/triggerSelectorRepair.js (version 4.0)
import { logger } from '@headlines/utils-server'

export async function triggerSelectorRepair(source, htmlContent, failedSelector) {
  logger.warn(
    `[Repair Orchestrator] SKIPPED for "${source.name}". Self-healing is disabled.`
  )
  // This function is now a no-op.
  return
}
