import { logger } from '@headlines/utils-server/node'
import { AIAgent } from '../lib/AIAgent.js'
import { emailSubjectSchema } from '../schemas/emailSubjectSchema.js'
import { emailIntroSchema } from '../schemas/emailIntroSchema.js'
import { settings } from '@headlines/config/node'
import { instructionEmailSubject, instructionEmailIntro } from '@headlines/prompts'

const getAgent = (systemPrompt, zodSchema) =>
  new AIAgent({
    model: settings.LLM_MODEL_SYNTHESIS,
    systemPrompt,
    zodSchema,
  })

export async function generateEmailSubjectLine(events) {
  const subjectLineAgent = getAgent(instructionEmailSubject, emailSubjectSchema)
  try {
    const eventPayload = events.map((e) => ({
      headline: e.synthesized_headline,
      summary: e.synthesized_summary,
    }))
    const response = await subjectLineAgent.execute(JSON.stringify(eventPayload))
    if (response.error || !response.subject_headline) {
      logger.warn('AI failed to generate a custom email subject line.', response)
      return 'Key Developments' // Fallback
    }
    return response.subject_headline
  } catch (error) {
    logger.error({ err: error }, 'Error in generateEmailSubjectLine')
    return 'Key Developments' // Fallback
  }
}

export async function generatePersonalizedIntro(user, events) {
  const introAgent = getAgent(instructionEmailIntro, emailIntroSchema)
  try {
    const eventPayload = events.map((e) => ({
      headline: e.synthesized_headline,
      summary: e.synthesized_summary,
    }))
    const payload = {
      firstName: user.firstName,
      events: eventPayload,
    }
    const response = await introAgent.execute(JSON.stringify(payload))

    // The schema returns a structured object, not a simple string.
    if (response.error || !response.greeting) {
      logger.warn('AI failed to generate a personalized intro.', response)
      // Return a fallback object that matches the schema's structure
      return {
        greeting: `Dear ${user.firstName},`,
        body: 'Here are the latest relevant wealth events we have identified for your review.',
        bullets: events
          .slice(0, 2)
          .map(
            (e) =>
              `A key development regarding ${e.synthesized_headline.substring(0, 40)}...`
          ),
        signoff: 'We wish you a fruitful day!\\n\\nThe team at Wealth Watch',
      }
    }
    return response // Return the full structured object
  } catch (error) {
    logger.error({ err: error }, 'Error in generatePersonalizedIntro')
    // Return a fallback object that matches the schema's structure
    return {
      greeting: `Dear ${user.firstName},`,
      body: 'Here are the latest relevant wealth events we have identified for your review.',
      bullets: events
        .slice(0, 2)
        .map(
          (e) =>
            `A key development regarding ${e.synthesized_headline.substring(0, 40)}...`
        ),
      signoff: 'We wish you a fruitful day!\\n\\nThe team at Wealth Watch',
    }
  }
}
