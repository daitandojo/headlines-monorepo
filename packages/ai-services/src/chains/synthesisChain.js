// packages/ai-services/src/chains/synthesisChain.js
// Uses Kimi for synthesis since it has web search tools
import { instructionSynthesize } from '@headlines/prompts'
import { callKimiModel, isKimiConfigured } from '../lib/langchain.js'
import { synthesisSchema } from '@headlines/models/schemas'
import { buildPrompt } from '../lib/promptBuilder.js'
import { logger } from '@headlines/utils-shared'

const systemPrompt = buildPrompt(instructionSynthesize)

export const synthesisChain = {
  async invoke(input) {
    const { context_json_string } = input;

    if (!isKimiConfigured()) {
      logger.error("Kimi not configured - synthesis requires web search");
      return { error: "Kimi not configured" };
    }

    try {
      const result = await callKimiModel({
        modelName: "kimi-k2-turbo-preview",
        systemPrompt,
        userContent: context_json_string,
        isJson: true,
        maxToolRounds: 10,
      });

      if (result.error) {
        logger.error({ err: result.error }, "Synthesis failed");
        return result;
      }

      // Validate against schema
      const parsed = synthesisSchema.parse(result);
      return parsed;
    } catch (error) {
      logger.error({ err: error }, "Synthesis chain error");
      return { error: error.message };
    }
  },
}
