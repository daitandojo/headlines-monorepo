// apps/pipeline/src/modules/email/components/emailBodyBuilder.js
import { logger, getCountryFlag } from "@headlines/utils-shared";
import { EMAIL_CONFIG } from "../../../config/index.js";
import { formatEventForEmail } from "./eventFormatter.js";
import { formatOpportunityForEmail } from "./opportunityFormatter.js"; // IMPORTED

function createWarRoomDashboard(events, opportunities, pending) {
  const eventCount = events.reduce((acc, arr) => acc + (arr?.length || 0), 0);
  const oppCount = opportunities.reduce((acc, arr) => acc + (arr?.length || 0), 0);
  const pendingCount = pending.reduce((acc, arr) => acc + (arr?.length || 0), 0);

  const totalLiquidity = opportunities.reduce((acc, arr) => {
    return acc + (arr || []).reduce((sum, o) => {
      return sum + (o.lastKnownEventLiquidityMM || o.profile?.estimatedNetWorthMM || 0);
    }, 0);
  }, 0);

  const formatLiquidity = (val) => {
    if (val >= 1000) return `$${(val / 1000).toFixed(1)}B`;
    return `$${val.toFixed(0)}M`;
  };

  const dashboardCard = (emoji, label, value, sublabel, color) => `
    <div style="flex: 1; min-width: 120px; text-align: center; padding: 16px 12px; background: rgba(255,255,255,0.03); border-radius: 12px; border: 1px solid rgba(255,255,255,0.08);">
      <div style="font-size: 28px; margin-bottom: 8px;">${emoji}</div>
      <div style="font-size: 24px; font-weight: 700; color: ${color || '#EAEAEA'};">${value}</div>
      <div style="font-size: 12px; color: #888; margin-top: 4px;">${label}</div>
      ${sublabel ? `<div style="font-size: 11px; color: #666; margin-top: 2px;">${sublabel}</div>` : ''}
    </div>
  `;

  return `
    <div style="background: linear-gradient(135deg, #1a1f2e 0%, #0d1117 100%); border-radius: 16px; padding: 24px; margin-bottom: 28px; border: 1px solid #2a3a50; box-shadow: 0 8px 32px rgba(0,0,0,0.4);">
      <div style="display: flex; align-items: center; margin-bottom: 16px;">
        <div style="font-size: 20px; margin-right: 10px;">🎯</div>
        <div style="font-size: 16px; font-weight: 600; color: #D4AF37; letter-spacing: 0.5px;">TODAY'S DEAL WAR ROOM</div>
        <div style="margin-left: auto; font-size: 12px; color: #666;">${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</div>
      </div>
      <div style="display: flex; gap: 12px; flex-wrap: wrap; justify-content: space-between;">
        ${dashboardCard('📰', 'Events Detected', eventCount, null, '#58a6ff')}
        ${dashboardCard('💎', 'Opportunities', oppCount, null, '#4CAF50')}
        ${dashboardCard('⏳', 'Pending Deals', pendingCount, null, '#FFC107')}
        ${dashboardCard('💰', 'Est. Liquidity', formatLiquidity(totalLiquidity), totalLiquidity > 0 ? '#D4AF37' : '#666')}
      </div>
    </div>
  `;
}

function createEmailWrapper(bodyContent, subject) {
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
  `;
}

export async function createPersonalizedEmailBody(
  user,
  eventsByCountry,
  opportunitiesByCountry,
  pendingTransactionsByCountry,
  subject,
  intro,
) {
  logger.info(
    { user: user.email, countries: Object.keys(eventsByCountry) },
    "Initiating email body generation.",
  );

  const hasEvents = eventsByCountry && Object.keys(eventsByCountry).length > 0;
  const hasOpps =
    opportunitiesByCountry && Object.keys(opportunitiesByCountry).length > 0;
  const hasPending =
    pendingTransactionsByCountry &&
    Object.keys(pendingTransactionsByCountry).length > 0;

if (!user || (!hasEvents && !hasOpps && !hasPending)) {
    logger.warn("createPersonalizedEmailBody: Missing user or content data.");
    return null;
  }

  if (!intro || !intro.bullets) {
    logger.warn("createPersonalizedEmailBody: Missing intro bullets, using fallback.");
    // Return a minimal email body
  }

  const introBullets = intro?.bullets || [];
  const bulletsHtml = introBullets.length > 0
    ? introBullets.map((b) => `<li style="margin-bottom: 10px;">${b}</li>`).join("")
    : "";

  const signoffHtml = Array.isArray(intro?.signoff)
    ? intro.signoff.join("<br>")
    : intro?.signoff || "";

  const greeting = intro?.greeting || "Dear Client,";
  const body = intro?.body || "Here are the latest relevant wealth events we have identified for your review.";

  // War Room Dashboard - aggregates all deal metrics
  const allEventsArr = Object.values(eventsByCountry || {}).flat();
  const allOppsArr = Object.values(opportunitiesByCountry || {}).flat();
  const allPendingArr = Object.values(pendingTransactionsByCountry || {}).flat();
  const warRoomDashboard = createWarRoomDashboard(
    Object.values(eventsByCountry || {}),
    Object.values(opportunitiesByCountry || {}),
    Object.values(pendingTransactionsByCountry || {})
  );

  const introHtml = `
    ${warRoomDashboard}
    <h1 class="main-heading" style="margin:0 0 20px 0; font-size: 24px; font-weight: bold;">${greeting}</h1>
    <p class="paragraph" style="margin:0 0 25px 0; font-size: 15px;">${body}</p>
    <ul class="paragraph" style="margin:0 0 25px 0; font-size: 15px; padding-left: 20px;">${bulletsHtml}</ul>
    <p class="paragraph" style="margin:0 0 25px 0; font-size: 15px;">${signoffHtml}</p>
  `;

  // --- START OF MODIFICATION ---
  let formattedContentHtml = "";
  const allCountries = [
    ...new Set([
      ...Object.keys(eventsByCountry || {}),
      ...Object.keys(opportunitiesByCountry || {}),
      ...Object.keys(pendingTransactionsByCountry || {}),
    ]),
  ].sort();

  for (const country of allCountries) {
    const flag = getCountryFlag(country);
    formattedContentHtml += `<tr><td style="padding: 30px 0 10px 0;"><h2 style="margin:0; font-size: 24px; font-weight: 500; color: #EAEAEA;">${flag} ${country}</h2></td></tr>`;

    // Pending Transactions (early signals) - show FIRST
    if (pendingTransactionsByCountry?.[country]?.length > 0) {
      formattedContentHtml += `<tr><td><h3 style="margin:10px 0; font-size: 18px; color: #F59E0B;">🔔 Pending Transactions (Early Signals)</h3></td></tr>`;
      for (const tx of pendingTransactionsByCountry[country]) {
        formattedContentHtml += `
          <tr><td style="padding: 15px; background: #2d2518; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid #F59E0B;">
            <p style="margin:0; font-size: 16px; font-weight: 600; color: #EAEAEA;">${tx.company}</p>
            <p style="margin: 6px 0 0; font-size: 14px; color: #F59E0B; font-weight: 500;">Status: ${tx.status || "In discussions"}</p>
            ${tx.estimatedValue ? `<p style="margin: 4px 0 0; font-size: 13px; color: #aaa;">Est. Value: ${tx.estimatedValue}</p>` : ""}
            ${tx.parties ? `<p style="margin: 4px 0 0; font-size: 13px; color: #aaa;">Parties: ${tx.parties}</p>` : ""}
          </td></tr>
        `;
      }
    }

    if (opportunitiesByCountry?.[country]) {
      formattedContentHtml += `<tr><td><h3 style="margin:10px 0; font-size: 18px; color: #4CAF50;">👤 Who to Contact</h3></td></tr>`;
      const oppPromises = opportunitiesByCountry[country].map(
        formatOpportunityForEmail,
      );
      const oppResults = await Promise.allSettled(oppPromises);
      oppResults.forEach((result) => {
        if (result.status === "fulfilled") {
          formattedContentHtml += `<tr><td>${result.value}</td></tr>`;
        }
      });
    }

    if (eventsByCountry?.[country]) {
      formattedContentHtml += `<tr><td><h3 style="margin:10px 0; font-size: 18px; color: #58a6ff;">📰 Completed Transactions</h3></td></tr>`;
      const eventPromises = eventsByCountry[country].map(formatEventForEmail);
      const eventResults = await Promise.allSettled(eventPromises);
      eventResults.forEach((result) => {
        if (result.status === "fulfilled" && result.value) {
          formattedContentHtml += `<tr><td>${result.value}</td></tr>`;
        }
      });
    }
  }
  // --- END OF MODIFICATION ---

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
                      ${formattedContentHtml}
                  </table>
              </td>
          </tr>
          <tr>
              <td style="padding:30px;">
                  <table role="presentation" style="width:100%;border-collapse:collapse;border:0;border-spacing:0;"><tr><td align="center"><p class="footer-text" style="margin:0;font-size:12px;">${EMAIL_CONFIG.brandName} | ${EMAIL_CONFIG.companyAddress}</p><p class="footer-text" style="margin:10px 0 0 0;font-size:12px;"><a href="${EMAIL_CONFIG.unsubscribeUrl}" style="color:#888888;text-decoration:underline;">Unsubscribe</a></p></td></tr></table>
              </td>
          </tr>
      </table>
    </div>`;

  logger.info(`Successfully generated email body for ${user.email}.`);
  return createEmailWrapper(mainContent, subject);
}
