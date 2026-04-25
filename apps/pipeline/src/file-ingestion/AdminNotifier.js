// apps/pipeline/src/file-ingestion/AdminNotifier.js
// Sends admin-only notification after file ingestion
import nodemailer from 'nodemailer'
import { settings } from '@headlines/config'
import { logger } from '@headlines/utils-shared'

export class AdminNotifier {
  static async notify(summary) {
    const { sourceFile, newOpportunities, existingRecords, excluded, errors, runId } = summary

    const subject = `[Pipeline] File ingestion complete — ${sourceFile} — ${newOpportunities} new opportunities`

    const body = `File ingestion run completed.

Source:          ${sourceFile}
Run ID:          ${runId}
Started:         ${summary.startTime?.toISOString() || 'N/A'}

RESULTS
  New opportunities created:    ${newOpportunities}
  Already in database (skipped): ${existingRecords}
  Excluded (not UHNW):           ${excluded}
  Enrichment failures:           ${errors}

Full log attached.

— Pipeline File Ingestion
`

    try {
      const transporter = nodemailer.createTransport({
        host: settings.SMTP_HOST,
        port: settings.SMTP_PORT,
        secure: settings.SMTP_SECURE === 'true',
        auth: {
          user: settings.SMTP_USER,
          pass: settings.SMTP_PASS,
        },
      })

      // Get admin email from settings or use default
      const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || settings.SMTP_FROM_ADDRESS

      await transporter.sendMail({
        from: settings.SMTP_FROM_ADDRESS,
        to: adminEmail,
        subject,
        text: body,
      })

      logger.info({ to: adminEmail }, '[AdminNotifier] Email sent')
      return true
    } catch (error) {
      logger.error({ err: error }, '[AdminNotifier] Failed to send email')
      return false
    }
  }
}