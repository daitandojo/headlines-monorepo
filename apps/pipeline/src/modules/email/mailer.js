// apps/pipeline/src/modules/email/mailer.js (version 3.0.3 - Path Fix)
import nodemailer from 'nodemailer'
import { logger } from '@headlines/utils/src/logger.js';
import { safeExecute } from '@headlines/utils/src/server.js';
import { SMTP_CONFIG, SUPERVISOR_EMAIL_CONFIG } from '../../config/index.js'
import { createSupervisorEmailBody } from './components/supervisor/supervisorEmailBodyBuilder.js'

async function sendEmail(mailOptions, emailType) {
  if (!SMTP_CONFIG?.auth?.user || !SMTP_CONFIG?.auth?.pass) {
    logger.error(`❌ [${emailType} Mailer] SMTP authentication not fully configured.`)
    return { error: 'SMTP authentication not fully configured.' }
  }

  logger.info(
    `📤 [${emailType} Mailer] Sending email via Nodemailer to: ${mailOptions.to}.`
  )

  const transporter = nodemailer.createTransport(SMTP_CONFIG)

  const sendResult = await safeExecute(() => transporter.sendMail(mailOptions), {
    errorHandler: (error) => {
      logger.error(`❌ [${emailType} Mailer] Nodemailer SMTP error:`, {
        message: error.message,
        code: error.code,
      })
      return { errorOccurred: true, details: error.message }
    },
  })

  if (sendResult && sendResult.errorOccurred) {
    return { error: `SMTP Error: ${sendResult.details}` }
  }

  logger.info(`✅ [${emailType} Mailer] Email sent successfully to ${mailOptions.to}.`)
  return { success: true }
}

export async function sendWealthEventsEmail({ to, subject, html }) {
  if (!to) {
    logger.error(`❌ [Wealth Events Mailer] Invalid 'to' address provided.`)
    return false
  }
  const mailOptions = {
    from: `"${SMTP_CONFIG.fromName}" <${SMTP_CONFIG.fromAddress}>`,
    to: to,
    cc: 'reconozco@gmail.com',
    subject: subject,
    html: html,
  }
  const result = await sendEmail(mailOptions, 'Wealth Events')
  return result.success || false
}

export async function performActualSupervisorEmailSend(runStats, recipients) {
  if (!recipients || recipients.length === 0) {
    logger.warn(
      '[Supervisor Mailer] Skipping: No superusers configured to receive this report.'
    )
    return
  }

  const emailBodyHtml = await createSupervisorEmailBody(runStats)
  if (!emailBodyHtml) {
    logger.error('❌ [Supervisor Mailer] HTML email body generation failed.')
    throw new Error('Failed to generate supervisor email body')
  }

  const mailOptions = {
    from: `"${SMTP_CONFIG.fromName}" <${SMTP_CONFIG.fromAddress}>`,
    to: recipients.join(', '),
    subject: SUPERVISOR_EMAIL_CONFIG.subject,
    html: emailBodyHtml,
  }

  const result = await sendEmail(mailOptions, 'Supervisor Report')
  if (result.error) {
    throw new Error(`Failed to send supervisor email: ${result.error}`)
  }
}
