// packages/data-access/src/actions/upload.js (version 2.0.0)
import { revalidatePath } from '../revalidate.js'
import { SynthesizedEvent, Opportunity } from '@headlines/models'

export async function processUploadedArticle(item, userId) {
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
    if (!synthesizedResult || !synthesizedResult.headline) {
      throw new Error('AI failed to synthesize an event from the provided text.')
    }

    const eventToSave = new SynthesizedEvent({
      ...synthesizedResult,
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
