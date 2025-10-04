// packages/data-access/src/core/upload.js
import { revalidatePath } from '../revalidate.js'
import { SynthesizedEvent, Opportunity } from '@headlines/models'

// This function is now "pure" - it accepts the AI services it needs as arguments.
export async function processUploadedArticle(
  item,
  userId,
  { synthesizeEvent, generateOpportunitiesFromEvent }
) {
  if (!userId) {
    return { success: false, error: 'Authentication required' }
  }

  try {
    const enrichedArticle = {
      ...item,
      relevance_article: 100,
      assessment_article: item.article,
      articleContent: { contents: [item.article] },
      newspaper: 'Manual Upload',
      country: 'Denmark',
      key_individuals: [],
    }

    const synthesizedResult = await synthesizeEvent([enrichedArticle], [], '', '')
    if (
      !synthesizedResult ||
      !synthesizedResult.events ||
      synthesizedResult.events.length === 0
    ) {
      throw new Error('AI failed to synthesize an event from the provided text.')
    }
    const eventData = synthesizedResult.events[0]

    const eventToSave = new SynthesizedEvent({
      ...eventData,
      event_key: `manual-${new Date().toISOString()}`,
      highest_relevance_score: 100,
      source_articles: [
        { headline: item.headline, link: '#manual', newspaper: 'Manual Upload' },
      ],
    })

    const opportunitiesToSave = await generateOpportunitiesFromEvent(eventToSave, [
      enrichedArticle,
    ])

    await eventToSave.save()
    if (opportunitiesToSave.length > 0) {
      await Opportunity.insertMany(
        opportunitiesToSave.map((opp) => ({ ...opp, events: [eventToSave._id] }))
      )
    }

    await revalidatePath('/events')
    await revalidatePath('/opportunities')

    return { success: true, event: eventToSave.synthesized_headline }
  } catch (e) {
    console.error('[Upload Action Error]:', e)
    return { success: false, error: e.message }
  }
}
