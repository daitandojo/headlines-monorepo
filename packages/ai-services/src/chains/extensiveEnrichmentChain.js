// packages/ai-services/src/chains/extensiveEnrichmentChain.js
import { instructionExtensiveEnrichment } from "@headlines/prompts";
import { callKimiModel, isKimiConfigured } from "../lib/langchain.js";
import { logger } from "@headlines/utils-shared";
import { buildPrompt } from "../lib/promptBuilder.js";

const systemPrompt = buildPrompt(instructionExtensiveEnrichment);

const COUNTRY_SEARCH_TIPS = {
  Denmark: 'SEARCH IN DANISH: Use "formue" (wealth), "familiekontor" (family office), "milliardær" (billionaire), "grundlægger" (founder). Danish news and registries write about Danish wealth in Danish, not English.',
  Netherlands: 'SEARCH IN DUTCH: Use "vermogen" (wealth), "familievermogen" (family wealth), "miljardair" (billionaire), "oprichter" (founder). Dutch sources write about Dutch wealth in Dutch.',
  Sweden: 'SEARCH IN SWEDISH: Use "förmögenhet" (wealth), "miljardär" (billionaire), "familjekontor" (family office).',
  Norway: 'SEARCH IN NORWEGIAN: Use "formue" (wealth), "milliardær" (billionaire), "gründer" (founder).',
  Germany: 'SEARCH IN GERMAN: Use "Vermögen" (wealth), "Milliardär" (billionaire), "Familienunternehmen" (family business).',
  France: 'SEARCH IN FRENCH: Use "patrimoine" (wealth), "milliardaire" (billionaire), "fortune" (fortune).',
  Spain: 'SEARCH IN SPANISH: Use "patrimonio" (wealth), "multimillonario" (billionaire), "fortuna" (fortune).',
}

export const extensiveEnrichmentChain = {
  async invoke(input) {
    const { name, company, currentContext, country } = input;
    const searchTip = COUNTRY_SEARCH_TIPS[country] || "Search in the local language of the individual's country. If Danish, use Danish terms. If Dutch, use Dutch terms. Do not assume English works for all countries.";

    if (!name || name.trim().length < 2) {
      logger.warn('[Extensive Enrichment] Skipping — empty or invalid name');
      return { error: 'Empty name' };
    }

    if (!isKimiConfigured()) {
      logger.warn("Kimi K2 not configured, skipping extensive enrichment");
      return { error: "Kimi not configured" };
    }

    const userContent = `
Research and map the family network, business peers, and related wealthy individuals for:

Seed Person: ${name}
Company: ${company || "N/A"}
Country: ${country || "Unknown"}
Previous Context:
${currentContext || "N/A"}

LANGUAGE INSTRUCTION (CRITICAL):
${searchTip}

Use web search to find: family office, family members, business connections, related wealthy individuals. Search in the LOCAL LANGUAGE of the individual's country, not in English.
`.trim();

    try {
      logger.info(`[Extensive Enrichment] Starting research for ${name}...`);

      const result = await callKimiModel({
        modelName: "kimi-latest",
        systemPrompt,
        userContent,
        isJson: true,
        maxToolRounds: 5,
      });

      if (result.error) {
        logger.error({ err: result.error }, "Extensive enrichment failed");
        return { error: result.error };
      }

      logger.info(`[Extensive Enrichment] Completed for ${name}`);
      return result;
    } catch (error) {
      logger.error({ err: error }, "Extensive enrichment chain error");
      return { error: error.message };
    }
  },
};
