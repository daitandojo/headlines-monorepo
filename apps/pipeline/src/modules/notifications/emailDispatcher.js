// apps/pipeline/src/modules/notifications/emailDispatcher.js
import { groupItemsByCountry, getCountryFlag } from '@headlines/utils-shared'
import { logger } from '@headlines/utils-shared'
import { createPersonalizedEmailBody } from '../email/components/emailBodyBuilder.js'
import { sendGenericEmail as sendWealthEventsEmail } from '@headlines/utils-server'
import {
  emailSubjectChain,
  emailIntroChain,
  translateChain,
} from '@headlines/ai-services'

export async function sendBulkEmails(emailQueue) {
  if (emailQueue.length === 0) return 0

  const isDryRun = process.env.DRY_RUN === 'true'
  if (isDryRun) {
    logger.warn(
      'DRY RUN MODE: Email dispatch is being simulated. No actual emails will be sent.'
    )
    let simulatedSuccessCount = 0
    for (const { user, events, opportunities } of emailQueue) {
      if ((events && events.length > 0) || (opportunities && opportunities.length > 0)) {
        logger.info(
          `[DRY RUN] Would have sent ${user.language} email to ${user.email} with ${events.length} events and ${opportunities.length} opportunities.`
        )
        simulatedSuccessCount++
      }
    }
    return simulatedSuccessCount
  }

  logger.info(
    `Dispatching ${emailQueue.length} personalized emails with AI-powered copy...`
  )
  let successCount = 0

  for (const { user, events, opportunities } of emailQueue) {
    try {
      const hasContent =
        (events && events.length > 0) || (opportunities && opportunities.length > 0)
      if (!hasContent) {
        logger.info(`Skipping email for ${user.email} as it contained no valid content.`)
        continue
      }

      // --- START OF MODIFICATION ---
      const eventsByCountry = groupItemsByCountry(events, 'country')
      const opportunitiesByCountry = groupItemsByCountry(opportunities, 'basedIn')
      const primaryCountry =
        Object.keys(opportunitiesByCountry)[0] || Object.keys(eventsByCountry)[0]
      const countryFlag = getCountryFlag(primaryCountry)

      const eventPayloadForAI = (events || []).map((e) => ({
        headline: e.synthesized_headline,
        summary: e.synthesized_summary,
      }))
      const oppPayloadForAI = (opportunities || []).map((o) => ({
        name: o.reachOutTo,
        reason: Array.isArray(o.whyContact) ? o.whyContact.join(' ') : o.whyContact,
        liquidity: o.lastKnownEventLiquidityMM,
      }))

      const [subjectResult, introResult] = await Promise.all([
        emailSubjectChain({
          events_json_string: JSON.stringify(eventPayloadForAI),
        }),
        emailIntroChain({
          payload_json_string: JSON.stringify({
            firstName: user.firstName,
            events: eventPayloadForAI,
            opportunities: oppPayloadForAI,
          }),
        }),
      ])
      // --- END OF MODIFICATION ---

      const aiSubject = subjectResult.subject_headline || 'Key Developments'

      const aiIntro = introResult.error
        ? {
            greeting: `Dear ${user.firstName},`,
            body: 'Here are the latest relevant wealth events we have identified for your review.',
            bullets: (events || [])
              .slice(0, 2)
              .map(
                (e) =>
                  `A key development regarding ${e.synthesized_headline.substring(0, 40)}...`
              ),
            signoff: ['We wish you a fruitful day!', 'The team at Wealth Watch'],
          }
        : introResult

      const subject = `${countryFlag} Intelligence Briefing: ${aiSubject}`

      const htmlBody = await createPersonalizedEmailBody(
        user,
        eventsByCountry,
        opportunitiesByCountry, // Pass opportunities to the body builder
        subject,
        aiIntro
      )

      if (!htmlBody) {
        logger.error(`Failed to generate email body for ${user.email}. Skipping.`)
        continue
      }

      let finalHtmlBody = htmlBody
      const targetLanguage = user.language || 'English'

      if (targetLanguage !== 'English') {
        logger.info(`Translating email for ${user.email} into ${targetLanguage}...`)
        const translationResult = await translateChain({
          language: targetLanguage,
          html_content: htmlBody,
        })
        if (translationResult.error) {
          logger.error(
            { err: translationResult.error, user: user.email },
            `AI translation to ${targetLanguage} failed. Sending in English as a fallback.`
          )
        } else {
          finalHtmlBody = translationResult.translated_html
          logger.info(`Successfully translated email for ${user.email}.`)
        }
      }

      const mailOptions = { to: user.email, subject, html: finalHtmlBody }
      const wasSent = await sendWealthEventsEmail(mailOptions)
      if (wasSent) successCount++
    } catch (error) {
      logger.error(
        { err: error, user: user.email },
        'A critical, unhandled error occurred during the email dispatch loop for a user. Skipping this user.'
      )
    }
  }

  return successCount
}
