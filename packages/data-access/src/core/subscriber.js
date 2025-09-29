// packages/data-access/src/actions/subscriber.js (Corrected)
import { Subscriber, PushSubscription } from '@headlines/models'
import dbConnect from '../dbConnect.js'

export async function getCurrentSubscriber(userId) {
  if (!userId) return { success: false, error: 'User ID is required' }
  try {
    await dbConnect()
    const user = await Subscriber.findById(userId).lean()
    if (!user) return { success: false, error: 'User not found' }
    return { success: true, data: JSON.parse(JSON.stringify(user)) }
  } catch (e) {
    return { success: false, error: 'Database error.' }
  }
}

export async function savePushSubscription(subscription, userId) {
  if (!userId) return { success: false, error: 'Authentication required' }
  if (!subscription || !subscription.endpoint)
    return { success: false, error: 'Invalid subscription object.' }
  try {
    await dbConnect()
    await PushSubscription.updateOne(
      { endpoint: subscription.endpoint },
      { $set: { ...subscription, subscriberId: userId } },
      { upsert: true }
    )
    return { success: true, message: 'Subscription saved.' }
  } catch (e) {
    return { success: false, error: 'Failed to save subscription.' }
  }
}

export async function updateUserProfile({ userId, updateData }) {
  if (!userId) return { success: false, error: 'User ID is required.' }
  if (!updateData) return { success: false, error: 'No update data provided.' }

  try {
    await dbConnect()
    const updatedUser = await Subscriber.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true }
    )
      .select('-password')
      .lean()
    if (!updatedUser) return { success: false, error: 'User not found.' }
    return { success: true, user: JSON.parse(JSON.stringify(updatedUser)) }
  } catch (error) {
    return { success: false, error: 'Failed to update profile.' }
  }
}
