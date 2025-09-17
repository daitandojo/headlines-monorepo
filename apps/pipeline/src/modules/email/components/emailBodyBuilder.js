// apps/pipeline/src/modules/email/components/emailBodyBuilder.js (version 4.1.1 - Path Fix)
import { logger } from '@headlines/utils/src/logger.js'
import { EMAIL_CONFIG } from '../../../config/index.js'
import { formatEventForEmail } from './eventFormatter.js'
import { getCountryFlag } from '@headlines/utils/src/index.js'

function createEmailWrapper(bodyContent, subject) {
  // ... (wrapper remains the same)
  return `
    <!DOCTYPE html>
    <html lang="en">
        <head>
            <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
            <title>${subject}</title>
            <style type="text/css">
                body { margin: 0; padding: 0; background-color: #0d1117; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; }
                .content-table { width: 100%; max-width: 640px; }
                .main-heading { color: #EAEAEA; font-weight: 600; }
                .paragraph { color: #cccccc; line-height: 1.7; }
                .button { background-color: #238636; border-radius: 6px; }
                .button a { color: #ffffff; text-decoration: none; display: inline-block; width: 100%; text-align: center; }
                .footer-text { color: #888888; }
                @media only screen and (max-width: 600px) {
                    .content-table { width: 100% !important; }
                    .content-background { padding: 20px 15px !important; }
                }
            </style>
        </head>
        <body style="margin: 0; padding: 0; background-color: #0d1117;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                    <td align="center" style="padding: 20px 0;">
                        ${bodyContent}
                    </td>
                </tr>
            </table>
        </body>
    </html>
  `
}

export async function createPersonalizedEmailBody(
  user,
  eventsByCountry,
  subject,
  intro // Now a structured object
) {
  logger.info(
    { user: user.email, countries: Object.keys(eventsByCountry) },
    'Initiating email body generation.'
  )

  if (!user || !eventsByCountry || Object.keys(eventsByCountry).length === 0) {
    logger.warn('createPersonalizedEmailBody: Missing user or events data.')
    return null
  }

  // Format the new intro structure
  const bulletsHtml = intro.bullets
    .map((b) => `<li style="margin-bottom: 10px;">${b}</li>`)
    .join('')
  const introHtml = `
    <h1 class="main-heading" style="margin:0 0 20px 0; font-size: 24px; font-weight: bold;">${intro.greeting}</h1>
    <p class="paragraph" style="margin:0 0 25px 0; font-size: 15px;">${intro.body}</p>
    <ul class="paragraph" style="margin:0 0 25px 0; font-size: 15px; padding-left: 20px;">${bulletsHtml}</ul>
    <p class="paragraph" style="margin:0 0 25px 0; font-size: 15px;">${intro.signoff.replace(/\\n/g, '<br>')}</p>
  `

  let formattedEventsHtml = ''
  for (const [country, events] of Object.entries(eventsByCountry)) {
    const flag = getCountryFlag(country) // CORRECTED: Use utility function
    formattedEventsHtml += `<tr><td style="padding: 30px 0 10px 0;"><h2 style="margin:0; font-size: 24px; font-weight: 500; color: #EAEAEA;">${flag} ${country}</h2></td></tr>`

    const eventPromises = events.map((event) => formatEventForEmail(event))
    const results = await Promise.allSettled(eventPromises)

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        formattedEventsHtml += `<tr><td>${result.value}</td></tr>`
      } else {
        const failedEvent = events[index]
        logger.error(
          {
            err: result.reason,
            event: { _id: failedEvent._id, headline: failedEvent.synthesized_headline },
          },
          'A single event card failed to render. It will be skipped in the email.'
        )
        formattedEventsHtml += `<tr><td><p style="color:red;">Error: Could not render event: ${failedEvent.synthesized_headline}</p></td></tr>`
      }
    })
  }

  const mainContent = `
    <div class="content-table" style="margin:0 auto;">
      <table role="presentation" style="width:100%;border-collapse:collapse;border:0;border-spacing:0;">
          <tr>
              <td style="padding:36px 30px;" class="content-background">
                  <table role="presentation" style="width:100%;border-collapse:collapse;border:0;border-spacing:0;">
                      <tr>
                          <td>
                              ${introHtml}
                          </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding: 10px 0 30px 0;">
                           <table role="presentation" border="0" cellspacing="0" cellpadding="0"><tr><td class="button" style="padding:14px 28px;"><a href="https://headlines-client.vercel.app" target="_blank" style="font-size: 16px;">View Full Dashboard</a></td></tr></table>
                        </td>
                      </tr>
                      ${formattedEventsHtml}
                  </table>
              </td>
          </tr>
          <tr>
              <td style="padding:30px;">
                  <table role="presentation" style="width:100%;border-collapse:collapse;border:0;border-spacing:0;"><tr><td align="center"><p class="footer-text" style="margin:0;font-size:12px;">${EMAIL_CONFIG.brandName} | ${EMAIL_CONFIG.companyAddress}</p><p class="footer-text" style="margin:10px 0 0 0;font-size:12px;"><a href="${EMAIL_CONFIG.unsubscribeUrl}" style="color:#888888;text-decoration:underline;">Unsubscribe</a></p></td></tr></table>
              </td>
          </tr>
      </table>
    </div>`

  logger.info(`Successfully generated email body for ${user.email}.`)
  return createEmailWrapper(mainContent, subject)
}
