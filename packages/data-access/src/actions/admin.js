// packages/data-access/src/actions/admin.js (version 2.2.0)
'use server'

import { Subscriber } from '@headlines/models'
import { verifyAdmin } from '@headlines/auth'
import { revalidatePath } from '../revalidate.js'
import dbConnect from '../dbConnect.js' // Internal helper

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

export async function createSubscriber(userData) {
  const { isAdmin, error } = await verifyAdmin()
  if (!isAdmin) return { success: false, error }

  try {
    await dbConnect()
    const newUser = new Subscriber(userData)
    await newUser.save()
    await revalidatePath('/admin/users')
    return { success: true, data: JSON.parse(JSON.stringify(newUser)) }
  } catch (e) {
    console.error('[Admin Action Error - createSubscriber]:', e)
    if (e.code === 11000) {
      return { success: false, error: 'A user with this email already exists.' }
    }
    return { success: false, error: 'Failed to create subscriber.' }
  }
}

export async function updateSubscriber(userId, updateData) {
  const { isAdmin, error } = await verifyAdmin()
  if (!isAdmin) return { success: false, error }

  try {
    await dbConnect()

    // CRITICAL FIX: If the password in the update data is an empty string,
    // delete it from the update object. This prevents the 'pre-save' hook
    // from attempting to hash an empty password, which would overwrite the
    // existing hash.
    if (updateData.password === '') {
      delete updateData.password
    }
    
    // ROBUSTNESS FIX: Use findByIdAndUpdate with $set for a more reliable, atomic update.
    // This correctly handles updates to nested fields and arrays like 'countries' and 'language',
    // resolving the issue where language changes were not being saved.
    const user = await Subscriber.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    if (!user) {
      return { success: false, error: 'User not found.' }
    }

    await revalidatePath('/admin/users')
    return { success: true, data: JSON.parse(JSON.stringify(user)) }
  } catch (e) {
    console.error('[Admin Action Error - updateSubscriber]:', e)
    return { success: false, error: 'Failed to update subscriber.' }
  }
}

export async function deleteSubscriber(userId) {
  const { isAdmin, error } = await verifyAdmin()
  if (!isAdmin) return { success: false, error }

  try {
    await dbConnect()
    const result = await Subscriber.findByIdAndDelete(userId)
    if (!result) {
      return { success: false, error: 'User not found.' }
    }
    await revalidatePath('/admin/users')
    return { success: true }
  } catch (e) {
    console.error('[Admin Action Error - deleteSubscriber]:', e)
    return { success: false, error: 'Failed to delete subscriber.' }
  }
}

export async function updateSubscribersStatus(userIds, isActive) {
  const { isAdmin, error } = await verifyAdmin()
  if (!isAdmin) return { success: false, error }
  try {
    await dbConnect()
    await Subscriber.updateMany({ _id: { $in: userIds } }, { $set: { isActive } })
    await revalidatePath('/admin/users')
    return { success: true }
  } catch (e) {
    console.error('[Admin Action Error - updateSubscribersStatus]:', e)
    return { success: false, error: 'Failed to bulk update subscribers.' }
  }
}

export async function deleteSubscribers(userIds) {
  const { isAdmin, error } = await verifyAdmin()
  if (!isAdmin) return { success: false, error }
  try {
    await dbConnect()
    await Subscriber.deleteMany({ _id: { $in: userIds } })
    await revalidatePath('/admin/users')
    return { success: true }
  } catch (e) {
    console.error('[Admin Action Error - deleteSubscribers]:', e)
    return { success: false, error: 'Failed to bulk delete subscribers.' }
  }
}
