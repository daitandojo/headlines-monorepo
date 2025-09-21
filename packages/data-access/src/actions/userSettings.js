// packages/data-access/src/actions/userSettings.js (version 2.1.3)
'use server'

import { Subscriber } from '../../../models/src/index.js'
import dbConnect from '../dbConnect.js'
import { revalidatePath } from '../revalidate.js'

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

    // These paths are in the client app
    await revalidatePath('/articles')
    await revalidatePath('/events')
    await revalidatePath('/opportunities')

    return { success: true, message: 'Your discarded items have been cleared.' }
  } catch (e) {
    console.error('[clearDiscardedItems Error]:', e)
    return { success: false, error: 'Failed to clear discarded items.' }
  }
}
