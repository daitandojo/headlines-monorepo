// apps/pipeline/scripts/seed/lib/event-chunker.js
import { callLanguageModel } from '../../../../../packages/ai-services/src/index.js'
import { settings } from '../../../../../packages/config/src/server.js'
// DEFINITIVE FIX: Import loggers from the shared utils package
import { logger, auditLogger } from '../../../../../packages/utils/src/server.js'
import { z } from 'zod'

const eventChunkSchema = z.object({
  events: z.array(
    z.object({
      date: z.string().describe('Estimated date of the event in YYYY-MM-DD format.'),
      description: z
        .string()
        .describe('A concise, one-sentence summary of the specific event.'),
      participants: z
        .array(z.string())
        .optional()
        .describe('List of key individuals or companies involved.'),
      type: z
        .string()
        .describe("The type of event (e.g., 'Sale', 'IPO', 'Wealth Profile')."),
    })
  ),
})

// --- REINFORCED PROMPT ---
const PROMPT = `You are a financial historian AI. Your task is to read a long biography of a wealthy individual and break it down into a timeline of distinct, significant wealth events.

**CRITICAL INSTRUCTIONS:**
1.  Read the entire background text provided.
2.  Identify specific, discrete events that impacted the person's wealth (e.g., company sales, major investments, IPOs, inheritance).
3.  For each event, extract the estimated date, a concise description, a list of key participants, and a simple event type string.
4.  If the text is a general profile without specific past events, you MUST create a single "Wealth Profile" event for the current year.
5.  Ignore non-financial events.

**OUTPUT FORMAT (MANDATORY):**
You MUST respond ONLY with a valid JSON object. This object MUST contain a single key called "events".
The value of "events" MUST be an ARRAY of event objects.

**EXAMPLE 1 (Multiple Events):**
{
  "events": [
    {
      "date": "1986-01-01",
      "description": "Faced legal issues regarding oil freight charges, but the case was later dropped.",
      "participants": ["John Fredriksen"],
      "type": "Legal Dispute"
    },
    {
      "date": "2007-01-01",
      "description": "Donated 50 million kroner to the Radium hospital for cancer research.",
      "participants": ["John Fredriksen"],
      "type": "Philanthropy"
    }
  ]
}

**EXAMPLE 2 (Single Event):**
{
  "events": [
    {
      "date": "2024-09-15",
      "description": "General wealth profile for a prominent figure in the Shipping industry.",
      "participants": ["John Fredriksen"],
      "type": "Wealth Profile"
    }
  ]
}

Your entire response must be ONLY the JSON object.`

const createFallbackEvent = (person) => {
  return [
    {
      date: `${person.year}-09-15`,
      description: `Wealth profile for ${person.name}, a prominent figure in the ${person.industry} sector with an estimated fortune of $${person.wealthMillionsUSD}M USD.`,
      participants: [person.name],
      type: 'Wealth Profile',
    },
  ]
}

export async function chunkHistoryIntoEvents(person) {
  logger.info(`  -> AI Event Chunker: Analyzing history for ${person.name}...`)
  try {
    auditLogger.info({ context: { background_text: person.background }}, `Event Chunker Input for ${person.name}`);
    const response = await callLanguageModel({
      modelName: settings.LLM_MODEL_UTILITY,
      systemPrompt: PROMPT,
      userContent: person.background,
      isJson: true,
    })
    auditLogger.info({ context: { llm_response: response }}, `Event Chunker Raw Output for ${person.name}`);

    const validation = eventChunkSchema.safeParse(response)
    if (!validation.success) {
      logger.error(
        { err: validation.error.flatten(), raw_response: response },
        'AI response failed Zod validation.'
      )
      return createFallbackEvent(person)
    }

    if (validation.data.events.length === 0) {
      return createFallbackEvent(person)
    }

    logger.info(
      `  -> AI Event Chunker: Identified ${validation.data.events.length} distinct event(s).`
    )
    return validation.data.events
  } catch (error) {
    logger.error(
      { err: error },
      `Event chunking failed for ${person.name}. Creating a single fallback event.`
    )
    return createFallbackEvent(person)
  }
}
