// apps/pipeline/src/utils/pipelineLogger.js (version 4.1.0)
import { logger } from '@headlines/utils-server'
import moment from 'moment'
import 'moment-duration-format'
import {
  formatRunFunnel,
  formatTopEvents,
  formatStrugglingSources,
  formatTokenUsage,
  formatApiUsage,
  formatContentScrapingFailures,
} from './reportSections.js'

const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
}

/**
 * The main function to log the final, comprehensive report for a pipeline run.
 * @param {Object} runStats - The statistics collected during the pipeline run.
 * @param {number} duration - The duration of the pipeline run in seconds.
 */
export async function logFinalReport(runStats, duration) {
  const formattedDuration = moment
    .duration(Math.round(duration), 'seconds')
    .format('h [hrs], m [min], s [sec]')

  let report = `\n\n${colors.cyan}=============================================================${colors.reset}\n`
  report += `${colors.cyan} 🚀 PIPELINE RUN SUMMARY${colors.reset}\n`
  report += `${colors.cyan}=============================================================${colors.reset}\n\n`
  report += `  ${colors.magenta}Duration:${colors.reset} ${formattedDuration}\n\n`

  report += formatTokenUsage(runStats)
  report += formatApiUsage(runStats)
  report += formatContentScrapingFailures(runStats)
  report += formatTopEvents(runStats)
  report += await formatStrugglingSources(runStats)

  report += '\n' + formatRunFunnel(runStats)
  report += `${colors.cyan}=============================================================${colors.reset}\n`

  logger.info(report)
}
