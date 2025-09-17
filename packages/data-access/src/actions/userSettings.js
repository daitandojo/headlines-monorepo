// packages/data-access/src/actions/userSettings.js (version 1.1)
'use server'

import { verifySession } from '../../../auth/src/index.js';
import { Subscriber } from '../../../models/src/index.js';
import dbConnect from '../dbConnect.js'
import { revalidatePath } from '../revalidate.js'

export async function clearDiscardedItems() {
    const { user, error } = await verifySession();
    if (!user) return { success: false, error: error || 'Authentication required.' };

    try {
        await dbConnect();
        await Subscriber.findByIdAndUpdate(user.userId, {
            $set: {
                'discardedItems.articles': [],
                'discardedItems.events': [],
                'discardedItems.opportunities': [],
            }
        });

        // Revalidate all data paths as this affects all lists
        await revalidatePath('/articles');
        await revalidatePath('/events');
        await revalidatePath('/opportunities');

        return { success: true, message: 'Your discarded items have been cleared.' };
    } catch (e) {
        console.error('[clearDiscardedItems Error]:', e);
        return { success: false, error: 'Failed to clear discarded items.' };
    }
}
