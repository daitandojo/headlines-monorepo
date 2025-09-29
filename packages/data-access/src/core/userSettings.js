// packages/data-access/src/actions/userSettings.js (Corrected)
import { Subscriber } from '@headlines/models'
import dbConnect from '@headlines/data-access/dbConnect/node'

export async function clearDiscardedItems(userId) {
  if (!userId) {
    return { success: false, error: 'User ID is required.' }
  }
  try {
    await dbConnect()
    await Subscriber.findByIdAndUpdate(userId, {
      $set: {
        'discardedItems.articles': [],
        'discardedItems.events': [],
        'discardedItems.opportunities': [],
      },
    })

    return { success: true, message: 'Your discarded items have been cleared.' }
  } catch (e) {
    console.error('[clearDiscardedItems Error]:', e)
    return { success: false, error: 'Failed to clear discarded items.' }
  }
}
