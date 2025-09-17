// packages/data-access/src/actions/subscriber.js (version 1.4.0)
'use server'

import dbConnect from '../dbConnect.js'
import { Subscriber } from '@headlines/models'
import { revalidatePath } from '../revalidate.js'
import { verifySession, getUserIdFromSession } from '@headlines/auth'

export async function updateUserProfile({ userId, updateData }) {
  const { user: sessionUser, error } = await verifySession();
  if (!sessionUser || sessionUser.userId !== userId) {
      return { success: false, error: error || 'Unauthorized' };
  }

  if (!userId) return { success: false, error: 'User ID is required.' }
  if (!updateData) return { success: false, error: 'No update data provided.' }

  try {
    await dbConnect()
    const updatedUser = await Subscriber.findByIdAndUpdate(userId, { $set: updateData }, { new: true })
      .select('-password')
      .lean()
    if (!updatedUser) return { success: false, error: 'User not found.' }
    await revalidatePath('/')
    return { success: true, user: JSON.parse(JSON.stringify(updatedUser)) }
  } catch (error) {
    return { success: false, error: 'Failed to update profile.' }
  }
}

export async function updateUserInteraction({ userId, itemId, itemType, action }) {
    if (!userId || !itemId || !itemType || !action) return { success: false, error: 'Missing parameters.' };
    
    const fieldMap = { event: 'events', article: 'articles', opportunity: 'opportunities' };
    const field = fieldMap[itemType];
    if (!field) return { success: false, error: 'Invalid item type.' };

    let updateOperation = {};
    switch (action) {
        case 'discard':
            updateOperation = { $addToSet: { [`discardedItems.${field}`]: itemId } };
            break;
        case 'favorite':
            updateOperation = { $addToSet: { [`favoritedItems.${field}`]: itemId } };
            break;
        case 'unfavorite':
            updateOperation = { $pull: { [`favoritedItems.${field}`]: itemId } };
            break;
        default:
            return { success: false, error: 'Invalid action.' };
    }

    try {
        await dbConnect();
        await Subscriber.updateOne({ _id: userId }, updateOperation);
        await revalidatePath('/');
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Failed to update user interaction.' };
    }
}

export async function updateUserFilterPreference(filterData) {
    const userId = await getUserIdFromSession();
    if (!userId) return { success: false, error: 'Authentication required.' };

    try {
        await dbConnect();
        const updatedUser = await Subscriber.findByIdAndUpdate(
            userId,
            { $set: { filterPreferences: filterData } },
            { new: true } // Return the full updated document
        ).lean();

        if (!updatedUser) return { success: false, error: 'User not found.' };

        revalidatePath('/', 'layout'); // Revalidate all pages as this affects layout data
        return { success: true, user: JSON.parse(JSON.stringify(updatedUser)) };
    } catch (error) {
        return { success: false, error: 'Failed to update filter preferences.' };
    }
}
