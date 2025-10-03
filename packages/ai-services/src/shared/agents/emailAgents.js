// packages/ai-services/src/shared/agents/emailAgents.js
import { logger } from '@headlines/utils-shared'
import { AIAgent } from '../../lib/AIAgent.js'
import { emailSubjectSchema, emailIntroSchema } from '@headlines/models/schemas'
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

    if (response.error || !response.greeting) {
      logger.warn('AI failed to generate a personalized intro.', response)
      return {
        greeting: `Dear ${user.firstName},`,
        body: 'Here are the latest relevant wealth events we have identified for your review.',
        bullets: events
          .slice(0, 2)
          .map(
            (e) =>
              `A key development regarding ${e.synthesized_headline.substring(0, 40)}...`
          ),
        signoff: ['We wish you a fruitful day!', 'The team at Wealth Watch'],
      }
    }
    return response
  } catch (error) {
    logger.error({ err: error }, 'Error in generatePersonalizedIntro')
    return {
      greeting: `Dear ${user.firstName},`,
      body: 'Here are the latest relevant wealth events we have identified for your review.',
      bullets: events
        .slice(0, 2)
        .map(
          (e) =>
            `A key development regarding ${e.synthesized_headline.substring(0, 40)}...`
        ),
      signoff: ['We wish you a fruitful day!', 'The team at Wealth Watch'],
    }
  }
}
