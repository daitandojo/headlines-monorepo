IGNORE_WHEN_COPYING_START
IGNORE_WHEN_COPYING_END

// src/actions/admin.js (version 1.0)
;('use server')

import dbConnect from '@/lib/mongodb'
import Subscriber from '@/models/Subscriber'
import { verifyAdmin } from '@/lib/adminAuth'
import { revalidatePath } from 'next/cache'

/**
 * Fetches all subscribers for the admin dashboard.
 * @returns {Promise<{success: boolean, data?: object[], error?: string}>}
 */
export async function getAllSubscribers() {
  const { isAdmin, error } = await verifyAdmin()
  if (!isAdmin) return { success: false, error }

  try {
    await dbConnect()
    const users = await Subscriber.find({}).sort({ createdAt: -1 }).lean()
    return { success: true, data: JSON.parse(JSON.stringify(users)) }
  } catch (e) {
    console.error('[Admin Action Error - getAllSubscribers]:', e)
    return { success: false, error: 'Failed to fetch subscribers.' }
  }
}

/**
 * Creates a new subscriber (e.g., via admin invitation).
 * @param {object} userData - The data for the new user.
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export async function createSubscriber(userData) {
  const { isAdmin, error } = await verifyAdmin()
  if (!isAdmin) return { success: false, error }

  try {
    await dbConnect()
    // The pre-save hook on the Subscriber model will hash the password
    const newUser = new Subscriber(userData)
    await newUser.save()
    revalidatePath('/admin/users')
    return { success: true, data: JSON.parse(JSON.stringify(newUser)) }
  } catch (e) {
    console.error('[Admin Action Error - createSubscriber]:', e)
    // Handle specific MongoDB duplicate key error for email
    if (e.code === 11000) {
      return { success: false, error: 'A user with this email already exists.' }
    }
    return { success: false, error: 'Failed to create subscriber.' }
  }
}

/**
 * Updates an existing subscriber's profile.
 * @param {string} userId - The ID of the user to update.
 * @param {object} updateData - The fields to update.
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export async function updateSubscriber(userId, updateData) {
  const { isAdmin, error } = await verifyAdmin()
  if (!isAdmin) return { success: false, error }

  try {
    await dbConnect()
    // If password is being updated, it will be hashed by the pre-save hook
    // Note: findByIdAndUpdate bypasses pre-save, so we fetch, update, and save.
    const user = await Subscriber.findById(userId)
    if (!user) {
      return { success: false, error: 'User not found.' }
    }
    Object.assign(user, updateData)
    await user.save()

    revalidatePath('/admin/users')
    return { success: true, data: JSON.parse(JSON.stringify(user)) }
  } catch (e) {
    console.error('[Admin Action Error - updateSubscriber]:', e)
    return { success: false, error: 'Failed to update subscriber.' }
  }
}

/**
 * Deletes a subscriber from the database.
 * @param {string} userId - The ID of the user to delete.
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteSubscriber(userId) {
  const { isAdmin, error } = await verifyAdmin()
  if (!isAdmin) return { success: false, error }

  try {
    await dbConnect()
    const result = await Subscriber.findByIdAndDelete(userId)
    if (!result) {
      return { success: false, error: 'User not found.' }
    }
    revalidatePath('/admin/users')
    return { success: true }
  } catch (e) {
    console.error('[Admin Action Error - deleteSubscriber]:', e)
    return { success: false, error: 'Failed to delete subscriber.' }
  }
}
