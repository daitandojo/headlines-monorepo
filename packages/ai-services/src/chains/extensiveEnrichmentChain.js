// packages/ai-services/src/chains/extensiveEnrichmentChain.js
import { instructionExtensiveEnrichment } from "@headlines/prompts";
import { callKimiModel, isKimiConfigured } from "../lib/langchain.js";
import { logger } from "@headlines/utils-shared";
import { buildPrompt } from "../lib/promptBuilder.js";

const systemPrompt = buildPrompt(instructionExtensiveEnrichment);

export const extensiveEnrichmentChain = {
  async invoke(input) {
    const { name, company, currentContext } = input;

    if (!isKimiConfigured()) {
      logger.warn("Kimi K2 not configured, skipping extensive enrichment");
      return { error: "Kimi not configured" };
    }

    const userContent = `
Research and map the family network, business peers, and related wealthy individuals for:

Seed Person: ${name}
Company: ${company || "N/A"}

Previous Context:
${currentContext || "N/A"}

Use web search to find: family office, family members, business connections, related wealthy individuals.
`.trim();

    try {
      logger.info(`[Extensive Enrichment] Starting research for ${name}...`);

      const result = await callKimiModel({
        modelName: "kimi-k2-turbo-preview",
        systemPrompt,
        userContent,
        isJson: true,
        maxToolRounds: 15,
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
