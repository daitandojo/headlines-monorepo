// apps/pipeline/src/modules/email/index.js (version 3.0.0)
import { logger } from '@headlines/utils/src/server.js';
import { performActualSupervisorEmailSend } from './mailer.js'
import { Subscriber } from '@headlines/models/src/index.js'

/**
 * Coordinates sending the supervisor report email.
 * @param {Object} runStats - Statistics about the current pipeline run.
 */
export async function sendSupervisorReportEmail(runStats) {
  if (!runStats) {
    logger.error('No runStats provided for supervisor report. Skipping email.')
    return
  }

  logger.info('Preparing supervisor report email...')

  try {
    const superUsers = await Subscriber.find({
      isActive: true,
      role: 'admin',
    })
      .select('email')
      .lean()

    const superUserEmails = superUsers.map((user) => user.email)

    if (superUserEmails.length === 0) {
      logger.warn('No admin users found. Skipping supervisor report.')
      return
    }

    await performActualSupervisorEmailSend(runStats, superUserEmails)
    logger.info('✅ Supervisor report email successfully sent/queued to all superusers.')
  } catch (error) {
    logger.error({ err: error }, '💥 CRITICAL: Failed to send supervisor report email.')
  }
}
