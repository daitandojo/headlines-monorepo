// packages/data-access/src/core/userSettings.js
import { Subscriber } from '@headlines/models'

export async function clearDiscardedItems(userId) {
  if (!userId) {
    return { success: false, error: 'User ID is required.' }
  }
  try {
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
