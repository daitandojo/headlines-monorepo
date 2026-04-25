// packages/pipeline/src/modules/email/components/opportunityFormatter.js
import { logger, getCountryFlag } from "@headlines/utils-shared";
import { contactSummaryChain } from "@headlines/ai-services";

const NEGATIVE_KEYWORDS = [
  "bankruptcy",
  "bankrupt",
  "insolvent",
  "liquidation",
  "winding up",
  "restructuring",
  "reorganization",
  "Chapter 11",
  "administration",
  "fraud",
  "scandal",
  "embezzlement",
  "money laundering",
  "criminal",
  "indicted",
  "convicted",
  "sentenced",
  "prison",
  "jail",
  "deceased",
  "died",
  "obituary",
  "passed away",
  "bankruptcy",
  "foreclosure",
  "default",
  "defaulted",
  "lawsuit",
  "litigation",
  "sued",
  "settlement",
  "divorce",
  "spousal",
  "alimony",
  "tax evasion",
  "tax fraud",
  "IRS",
  "HMRC",
  "sanction",
  "embargo",
  "blocklist",
  "deceased",
  "died",
  "passed away",
  "obituary",
];

function isNegativeContent(text) {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  return NEGATIVE_KEYWORDS.some((keyword) => lowerText.includes(keyword));
}

function formatRelationships(relatedIndividuals = []) {
  if (!relatedIndividuals || relatedIndividuals.length === 0) return "";

  const relationships = relatedIndividuals
    .map((r) => {
      const typeEmoji =
        r.type === "family" ? "👨‍👩‍👧" : r.type === "peer" ? "🤝" : "🔗";
      return `<span style="display: inline-block; margin-right: 8px; margin-bottom: 4px; padding: 3px 8px; background: #2a3a30; border-radius: 4px; font-size: 12px; color: #aaa;">
      ${typeEmoji} ${r.name} (${r.relationship || r.type})
    </span>`;
    })
    .join("");

  return `
    <tr>
      <td style="padding: 12px 0 8px; border-top: 1px solid #2a3a30;">
        <p style="margin:0; font-size: 12px; color: #888; font-weight: 600;">CONNECTED TO</p>
        <div style="margin-top: 6px;">${relationships}</div>
      </td>
    </tr>
  `;
}

function createOpportunityCard(opportunity, contactSummary = null) {
  const {
    reachOutTo,
    contactDetails,
    lastKnownEventLiquidityMM,
    basedIn,
    whyContact,
    profile,
    relatedIndividuals = [],
  } = opportunity;

  const flags = Array.isArray(basedIn)
    ? basedIn.map(getCountryFlag).join(" ")
    : getCountryFlag(basedIn);

  const wealthDisplay = profile?.estimatedNetWorthMM
    ? `$${profile.estimatedNetWorthMM}M`
    : lastKnownEventLiquidityMM
      ? `$${lastKnownEventLiquidityMM}M`
      : "TBD";

  const locationDisplay = Array.isArray(basedIn)
    ? basedIn.join(", ")
    : basedIn || "Location TBD";

  // Extract specific reason from whyContact
  let specificReason = null;
  if (whyContact && Array.isArray(whyContact) && whyContact.length > 0) {
    const reasons = whyContact.filter((r) => !isNegativeContent(r));
    if (reasons.length > 0) {
      // Use the most recent/relevant reason
      specificReason = reasons[0].substring(0, 200);
    }
  } else if (whyContact && typeof whyContact === "string") {
    if (!isNegativeContent(whyContact)) {
      specificReason = whyContact.substring(0, 200);
    }
  }

  // Email display
  const email = contactDetails?.email;
  const emailDisplay = email
    ? `<a href="mailto:${email}" style="color: #4CAF50; text-decoration: none; font-size: 15px; font-weight: 500;">${email}</a>
       <span style="color: #666; font-size: 11px; margin-left: 8px;">(click to email)</span>`
    : `<span style="color: #666; font-size: 13px; font-style: italic;">No email found</span>`;

  return `
    <div style="background-color: #1A2E27; border-radius: 12px; margin-bottom: 25px; padding: 25px; border: 1px solid #2A4F3A; box-shadow: 0 10px 25px rgba(0,0,0,0.3);">
        <table role="presentation" style="width:100%;border-collapse:collapse;border:0;border-spacing:0;">
            <tr>
                <td style="padding-bottom: 12px;">
                    <table role="presentation" style="width:100%;border-collapse:collapse;border:0;border-spacing:0;">
                        <tr>
                            <td style="width: 80px; vertical-align: top;" valign="top">
                                <p style="font-size: 28px; font-weight: 700; color: #4CAF50; margin: 0;">${wealthDisplay}</p>
                                <p style="font-size: 11px; color: #a0a0a0; margin: 0;">Est. Net Worth</p>
                            </td>
                            <td style="padding-left: 20px;">
                                <h2 style="margin:0; font-size: 20px; font-weight: 600; color: #EAEAEA; line-height: 1.4;">${flags} ${reachOutTo}</h2>
                                <p style="margin: 4px 0 0; font-size: 14px; color: #bbbbbb;">
                                  ${contactDetails?.role || "Key Principal"} at <strong>${contactDetails?.company || "N/A"}</strong>
                                </p>
                                <p style="margin: 4px 0 0; font-size: 12px; color: #888888;">📍 ${locationDisplay}</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-top: 1px solid #2a3a30;">
                <p style="margin:0; font-size: 12px; color: #888; font-weight: 600;">EMAIL</p>
                <p style="margin: 4px 0 0; font-size: 15px;">${emailDisplay}</p>
              </td>
            </tr>
            ${
              specificReason
                ? `
            <tr>
              <td style="padding: 12px 0 8px; border-top: 1px solid #2a3a30;">
                <p style="margin:0; font-size: 12px; color: #D4AF37; font-weight: 600;">💰 WHY CONTACT NOW</p>
                <p style="margin: 6px 0 0; font-size: 14px; color: #ddd; line-height: 1.5;">${specificReason}</p>
              </td>
            </tr>
            `
                : ""
            }
            ${relatedIndividuals.length > 0 ? formatRelationships(relatedIndividuals) : ""}
        </table>
    </div>
  `;
}

export async function formatOpportunityForEmail(opportunity) {
  logger.info(
    { opportunity: { name: opportunity.reachOutTo } },
    "Formatting opportunity card for email.",
  );
  if (
    !opportunity ||
    typeof opportunity !== "object" ||
    !opportunity.reachOutTo
  ) {
    logger.warn(
      `formatOpportunityForEmail: Invalid opportunity object provided.`,
      {
        oppPreview: opportunity,
      },
    );
    throw new Error("Invalid opportunity object provided.");
  }
  try {
    let contactSummary = null;

    // Generate AI contact summary (only if no specific reason available)
    if (
      !opportunity.whyContact ||
      (Array.isArray(opportunity.whyContact) &&
        opportunity.whyContact.length === 0)
    ) {
      try {
        contactSummary = await contactSummaryChain(opportunity);
      } catch (err) {
        logger.warn(
          { err: err.message },
          "Failed to generate contact summary, using fallback",
        );
      }
    }

    const cardHtml = createOpportunityCard(opportunity, contactSummary);
    logger.info(
      { oppName: opportunity.reachOutTo },
      "Successfully formatted opportunity card.",
    );
    return cardHtml;
  } catch (error) {
    logger.error(
      `Error creating opportunity card for email: "${opportunity.reachOutTo}"`,
      { errorMessage: error.message, stack: error.stack },
    );
    throw error;
  }
}
