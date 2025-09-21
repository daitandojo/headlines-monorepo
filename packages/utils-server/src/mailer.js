import nodemailer from 'nodemailer'
import { logger } from './logger.js'
import { safeExecute } from './helpers.js'
import { SMTP_CONFIG } from '@headlines/config/server'

async function sendEmail(mailOptions, emailType) {
  if (!SMTP_CONFIG?.auth?.user || !SMTP_CONFIG?.auth?.pass) {
    logger.error(`❌ [${emailType} Mailer] SMTP authentication not fully configured.`)
    return { error: 'SMTP authentication not fully configured.' }
  }
  const transporter = nodemailer.createTransport(SMTP_CONFIG)
  const sendResult = await safeExecute(() => transporter.sendMail(mailOptions), {
    errorHandler: (error) => ({ errorOccurred: true, details: error.message }),
  })
  if (sendResult && sendResult.errorOccurred) {
    logger.error(`❌ [${emailType} Mailer] Nodemailer SMTP error:`, {
      details: sendResult.details,
    })
    return { error: `SMTP Error: ${sendResult.details}` }
  }
  logger.info(`✅ [${emailType} Mailer] Email sent successfully to ${mailOptions.to}.`)
  return { success: true }
}

export async function sendGenericEmail({ to, subject, html, emailType = 'Generic' }) {
  if (!to) {
    logger.error(`❌ [${emailType} Mailer] Invalid 'to' address provided.`)
    return false
  }
  const mailOptions = {
    from: `"${SMTP_CONFIG.fromName}" <${SMTP_CONFIG.fromAddress}>`,
    to,
    subject,
    html,
  }
  const result = await sendEmail(mailOptions, emailType)
  return result.success || false
}
