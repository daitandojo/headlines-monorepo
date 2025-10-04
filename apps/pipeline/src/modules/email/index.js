// apps/pipeline/src/modules/email/index.js (MODIFIED to accept traces)
import { logger } from '@headlines/utils-shared'
import { sendGenericEmail } from '@headlines/utils-server'
import { Subscriber } from '@headlines/models'
import { createSupervisorEmailBody } from './components/supervisor/supervisorEmailBodyBuilder.js'

/**
 * Coordinates sending the supervisor report email.
 * @param {Object} runStats - Statistics about the current pipeline run.
 * @param {Array<Object>} articleTraces - Detailed traces for each processed article.
 */
export async function sendSupervisorReportEmail(runStats, articleTraces = []) {
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

    // Generate the complex HTML body, now including the article traces
    const emailBody = await createSupervisorEmailBody(runStats, articleTraces)

    // Send the email using the shared mailer
    await sendGenericEmail({
      to: superUserEmails.join(','),
      subject: '⚙️ Hourly Headlines Processing Run Summary',
      html: emailBody,
      emailType: 'SupervisorReport',
    })

    logger.info('✅ Supervisor report email successfully sent/queued to all superusers.')
  } catch (error) {
    logger.error({ err: error }, '💥 CRITICAL: Failed to send supervisor report email.')
  }
}
