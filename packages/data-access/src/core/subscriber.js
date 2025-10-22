// packages/data-access/src/core/subscriber.js
import { Subscriber, PushSubscription, Feedback } from '@headlines/models' // ADDED: Feedback model

export async function upsertSubscriber(filter, userData) {
  try {
    const user = await Subscriber.findOneAndUpdate(filter, userData, {
      new: true,
      upsert: true,
      runValidators: true,
    }).lean()
    return { success: true, user: JSON.parse(JSON.stringify(user)) }
  } catch (error) {
    if (error.code === 11000)
      return { success: false, error: 'A user with this email already exists.' }
    return { success: false, error: 'Failed to upsert subscriber.' }
  }
}

export async function getAllPushSubscriptions() {
  try {
    const subscriptions = await PushSubscription.find().lean()
    return { success: true, data: JSON.parse(JSON.stringify(subscriptions)) }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function deletePushSubscription(filter) {
  try {
    const result = await PushSubscription.deleteOne(filter)
    return { success: true, deletedCount: result.deletedCount }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function getCurrentSubscriber(userId) {
  if (!userId) return { success: false, error: 'User ID is required' }
  try {
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

export async function updateUserInteraction({ userId, itemId, itemType, action }) {
  const modelName = `${itemType}s`
  let updateQuery

  switch (action) {
    case 'favorite':
      updateQuery = { $addToSet: { [`favoritedItems.${modelName}`]: itemId } }
      break
    case 'unfavorite':
      updateQuery = { $pull: { [`favoritedItems.${modelName}`]: itemId } }
      break
    case 'discard':
      updateQuery = { $addToSet: { [`discardedItems.${modelName}`]: itemId } }
      break
    default:
      return { success: false, error: 'Invalid action.' }
  }

  try {
    const result = await Subscriber.updateOne({ _id: userId }, updateQuery)
    if (result.matchedCount === 0) return { success: false, error: 'User not found.' }

    // --- START OF MODIFICATION ---
    // After successfully updating the user's preference, log this as a feedback event.
    // We treat 'unfavorite' as a form of 'discard' for feedback purposes.
    const feedbackType = action === 'unfavorite' ? 'discard' : action
    const feedbackDoc = new Feedback({
      userId,
      itemId,
      itemType,
      feedbackType,
    })
    await feedbackDoc.save()
    // --- END OF MODIFICATION ---

    return { success: true }
  } catch (e) {
    console.error('[updateUserInteraction Error]', e) // Added more detailed logging
    return { success: false, error: 'Database interaction failed.' }
  }
}
