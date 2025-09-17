// packages/scraper-logic/src/ai/agents/executiveSummaryAgent.js (version 2.0)
import { getConfig } from '../../config.js';
import { AIAgent } from '../AIAgent.js';
import { env } from '@headlines/config';
import { instructionExecutiveSummary } from '@headlines/prompts';
import { z } from 'zod';

const executiveSummarySchema = z.object({
  summary: z.string(),
});

const getAgent = () =>
  new AIAgent({
    model: env.LLM_MODEL_SYNTHESIS,
    systemPrompt: instructionExecutiveSummary,
    zodSchema: executiveSummarySchema,
  });

export async function generateExecutiveSummary(judgeVerdict, runStats) {
  const agent = getAgent();
  try {
    // Create a payload with the crucial context
    const payload = {
      freshHeadlinesFound: runStats.freshHeadlinesFound,
      judgeVerdict: judgeVerdict || { event_judgements: [], opportunity_judgements: [] },
    };

    const response = await agent.execute(JSON.stringify(payload));
    if (response.error || !response.summary) {
      getConfig().logger.warn('AI failed to generate an executive summary.', response);
      return 'AI failed to generate a summary for this run.';
    }
    return response.summary;
  } catch (error) {
    getConfig().logger.error({ err: error }, 'Error in generateExecutiveSummary');
    return 'An unexpected error occurred while generating the executive summary.';
  }
}
