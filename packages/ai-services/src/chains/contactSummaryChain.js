// packages/ai-services/src/chains/contactSummaryChain.js
import { callLanguageModel } from "../lib/langchain.js";
import { logger } from "@headlines/utils-shared";

const SYSTEM_PROMPT = `You are a elite wealth intelligence analyst drafting concise, compelling contact summaries for high-net-worth individuals.

Your task: Transform raw opportunity data into a 2-3 sentence "elevator pitch" that tells an advisor:
1. WHO this person is (name, role, background)
2. THEIR WEALTH (estimated net worth, source of wealth)
3. WHY CONTACT THEM NOW (specific, time-sensitive reason)

Write in a professional, confident tone. Be direct. No fluff. Each word must earn its place.`;

const USER_PROMPT_TEMPLATE = `Generate a contact summary for the following opportunity:

NAME: {{name}}
ROLE: {{role}}
COMPANY: {{company}}
ESTIMATED WEALTH: {{wealthMM}}M USD
WEALTH SOURCE: {{wealthOrigin}}
LOCATION: {{basedIn}}
WHY CONTACT (raw bullets):
{{whyContact}}

REQUIRED OUTPUT: A 2-3 sentence summary that answers:
- Who is this? (name + brief context)
- What's their wealth situation? 
- Why is THIS the right moment to reach out?

Keep it to 50-75 words maximum. Focus on the "why now" - what makes this urgent or relevant.`;

export async function generateContactSummary(opportunity) {
  const { reachOutTo, contactDetails, basedIn, whyContact, profile } =
    opportunity;

  const name = reachOutTo || "Unknown";
  const role = contactDetails?.role || "Key Principal";
  const company = contactDetails?.company || "N/A";
  const wealthMM = profile?.estimatedNetWorthMM || "N/A";
  const wealthOrigin = profile?.wealthOrigin || "Unknown";
  const location = Array.isArray(basedIn)
    ? basedIn.join(", ")
    : basedIn || "Unknown";
  const reasons = Array.isArray(whyContact)
    ? whyContact.join("\n")
    : "No specific reasons provided";

  const userContent = USER_PROMPT_TEMPLATE.replace("{name}", name)
    .replace("{role}", role)
    .replace("{company}", company)
    .replace("{wealthMM}", wealthMM)
    .replace("{wealthOrigin}", wealthOrigin)
    .replace("{basedIn}", location)
    .replace("{whyContact}", reasons);

  try {
    const result = await callLanguageModel({
      modelName: "xiaomi/mimo-v2-flash",
      systemPrompt: SYSTEM_PROMPT,
      userContent,
      isJson: false,
    });

    if (result.error) {
      logger.warn(
        { err: result.error },
        "Contact summary generation failed, using fallback",
      );
      return createFallbackSummary(opportunity);
    }

    return result;
  } catch (error) {
    logger.error({ err: error }, "Error generating contact summary");
    return createFallbackSummary(opportunity);
  }
}

function createFallbackSummary(opportunity) {
  const { reachOutTo, contactDetails, whyContact, profile } = opportunity;
  const name = reachOutTo || "Unknown";
  const role = contactDetails?.role || "Key Principal";
  const company = contactDetails?.company || "N/A";
  const wealthMM = profile?.estimatedNetWorthMM || "N/A";

  const topReason =
    Array.isArray(whyContact) && whyContact.length > 0
      ? whyContact[0]
      : "High-value target identified for proactive outreach";

  return `${name} serves as ${role} at ${company}. Estimated wealth of $${wealthMM}M. ${topReason}`;
}

export const contactSummaryChain = {
  generate: generateContactSummary,
  generateBatch: async (opportunities) => {
    const results = await Promise.all(
      opportunities.map(async (opp) => {
        const summary = await generateContactSummary(opp);
        return { opportunityId: opp._id, summary };
      }),
    );
    return results;
  },
};
