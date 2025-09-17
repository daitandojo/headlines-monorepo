// src/actions/subscriber.js (version 1.0)
'use server'

import dbConnect from '@/lib/mongodb'
import Subscriber from '@/models/Subscriber'
import { revalidatePath } from 'next/cache'

/**
 * Updates a user's profile in the database.
 * @param {{userId: string, updateData: object}} params
 * @returns {Promise<{success: boolean, user?: object, error?: string}>}
 */
export async function updateUserProfile({ userId, updateData }) {
  if (!userId) {
    return { success: false, error: 'User ID is required.' }
  }
  if (!updateData || Object.keys(updateData).length === 0) {
    return { success: false, error: 'No update data provided.' }
  }

  try {
    await dbConnect()
    console.log(`[Action] Updating profile for user ${userId} with data:`, updateData)

    const updatedUser = await Subscriber.findByIdAndUpdate(userId, updateData, {
      new: true,
    }).lean()

    if (!updatedUser) {
      return { success: false, error: 'User not found.' }
    }

    revalidatePath('/') // Revalidate all pages as user data is global
    console.log(`[Action] Profile for user ${userId} updated successfully.`)

    // The password field has `select: false` in the model, so it won't be returned here.
    return { success: true, user: JSON.parse(JSON.stringify(updatedUser)) }
  } catch (error) {
    console.error('[Update Profile Error]', error)
    return { success: false, error: 'Failed to update profile.' }
  }
}
