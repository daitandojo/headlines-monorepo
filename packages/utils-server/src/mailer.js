// Full Path: headlines/packages/utils-server/src/mailer.js
import nodemailer from 'nodemailer'
import { logger } from './logger.js'
import { safeExecute } from './helpers.js'
import { SMTP_CONFIG } from '@headlines/config'
import { Subscriber } from '@headlines/models'

// Cache for admin emails to avoid hitting the DB for every single email sent.
let adminEmailsCache = null
let cacheTimestamp = 0
const CACHE_TTL = 1000 * 60 * 5 // 5 minutes

async function getAdminEmails() {
  if (adminEmailsCache && Date.now() - cacheTimestamp < CACHE_TTL) {
    return adminEmailsCache
  }

  const admins = await Subscriber.find({ role: 'admin', isActive: true })
    .select('email')
    .lean()
  adminEmailsCache = admins.map((admin) => admin.email)
  cacheTimestamp = Date.now()

  return adminEmailsCache
}

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
  logger.info(
    `✅ [${emailType} Mailer] Email sent successfully to ${mailOptions.to}. BCC: ${mailOptions.bcc || 'None'}`
  )
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

  // --- START DEFINITIVE FIX ---
  // Apply BCC logic ONLY for non-supervisor reports.
  if (emailType !== 'SupervisorReport') {
    const allAdminEmails = await getAdminEmails()

    // Filter out the primary recipient from the BCC list if they are an admin.
    const bccList = allAdminEmails.filter(
      (adminEmail) => adminEmail.toLowerCase() !== to.toLowerCase()
    )

    if (bccList && bccList.length > 0) {
      mailOptions.bcc = bccList.join(',')
    }
  }
  // --- END DEFINITIVE FIX ---

  const result = await sendEmail(mailOptions, emailType)
  return result.success || false
}
