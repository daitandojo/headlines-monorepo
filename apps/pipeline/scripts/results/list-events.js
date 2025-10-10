// apps/pipeline/scripts/results/list-events.js
/**
 * @command results:list-events
 * @group Results
 * @description Show the 10 most recently created synthesized events.
 */
import { initializeScriptEnv } from '../seed/lib/script-init.js'
import { findEvents } from '@headlines/data-access'
import { formatDistanceToNow } from 'date-fns'

async function main() {
  await initializeScriptEnv()
  try {
    const eventsResult = await findEvents({ limit: 10 })
    if (!eventsResult.success) throw new Error(eventsResult.error)

    const events = eventsResult.data
    if (events.length === 0) {
      console.log('No recent events found.')
    } else {
      console.log('\n--- Last 10 Synthesized Events ---')
      console.table(
        events.map((e) => ({
          Headline: e.synthesized_headline.substring(0, 80),
          Score: e.highest_relevance_score,
          Country: e.country,
          'Key Individuals': (e.key_individuals || []).map((k) => k.name).join(', '),
          Created: `${formatDistanceToNow(new Date(e.createdAt))} ago`,
        }))
      )
    }
  } catch (error) {
    console.error('Failed to list events:', error)
  }
}
main()
